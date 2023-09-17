use std::collections::HashMap;
use std::time::Duration;

use log::{debug, error, trace, warn};
use meshtastic::packet::PacketRouter;
use meshtastic::protobufs;
use tauri::api::notification::Notification;
use tokio::sync::mpsc::UnboundedReceiver;

use crate::device::DeviceConnectionStatus;
use crate::ipc::events::{dispatch_configuration_status, dispatch_rebooting_event};
use crate::ipc::{events, ConfigurationStatus};
use crate::state::DeviceKey;
use crate::{analytics, device};
use crate::{graph, state};

use super::CommandError;

pub fn generate_graph_edges_geojson(graph: &mut device::MeshGraph) -> geojson::FeatureCollection {
    let edge_features: Vec<geojson::Feature> = graph
        .graph
        .get_edges()
        .iter()
        .filter(|e| {
            let u = graph
                .graph
                .get_node(e.u)
                .expect("Index from edge should exist");

            let v = graph
                .graph
                .get_node(e.v)
                .expect("Index from edge should exist");

            u.longitude != 0.0 && u.latitude != 0.0 && v.latitude != 0.0 && v.longitude != 0.0
        })
        .map(|e| {
            let u = graph
                .graph
                .get_node(e.u)
                .expect("Index from edge should exist");

            let v = graph
                .graph
                .get_node(e.v)
                .expect("Index from edge should exist");

            geojson::Feature {
                id: Some(geojson::feature::Id::String(format!(
                    "{}-{}",
                    u.name, v.name
                ))),
                properties: None,
                geometry: Some(geojson::Geometry::new(geojson::Value::LineString(vec![
                    vec![u.longitude, u.latitude, u.altitude],
                    vec![v.longitude, v.latitude, v.altitude],
                ]))),
                ..Default::default()
            }
        })
        .collect();

    geojson::FeatureCollection {
        bbox: None,
        foreign_members: None,
        features: edge_features,
    }
}

pub fn node_index_to_node_id(
    nodeindex: &petgraph::graph::NodeIndex,
    graph: &graph::graph_ds::Graph,
) -> Option<u32> {
    graph.node_idx_map.iter().find_map(|(key, &val)| {
        if val == *nodeindex {
            return key.parse::<u32>().ok();
        }
        None
    })
}

pub async fn initialize_graph_state(
    mesh_graph: tauri::State<'_, state::NetworkGraph>,
    algo_state: tauri::State<'_, state::AnalyticsState>,
) -> Result<(), CommandError> {
    let new_graph = device::MeshGraph::new();
    let state = analytics::state::AnalyticsState::new(HashMap::new(), false);
    let mesh_graph_arc = mesh_graph.inner.clone();
    let algo_state_arc = algo_state.inner.clone();

    {
        let mut new_graph_guard = mesh_graph_arc.lock().await;
        *new_graph_guard = Some(new_graph);
    }

    {
        let mut new_state_guard = algo_state_arc.lock().await;
        *new_state_guard = Some(state);
    }

    Ok(())
}

pub fn spawn_configuration_timeout_handler(
    handle: tauri::AppHandle,
    connected_devices_inner: state::MeshDevicesInner,
    device_key: DeviceKey,
    timeout: Duration,
) {
    trace!("Spawning device configuration timeout");

    tauri::async_runtime::spawn(async move {
        // Wait for device to configure
        tokio::time::sleep(timeout).await;

        trace!("Device configuration timeout completed");

        let mut devices_guard = connected_devices_inner.lock().await;
        let device = match devices_guard
            .get_mut(&device_key)
            .ok_or("Device not initialized")
        {
            Ok(d) => d,
            Err(e) => {
                warn!("{}", e);
                return;
            }
        };

        // If the device is not registered as configuring, take no action
        // since this means the device configuration has succeeded.

        if device.status != DeviceConnectionStatus::Configuring {
            return;
        }

        // If device hasn't completed configuration in allotted time,
        // tell the UI layer that the configuration failed

        warn!("Device configuration timed out, telling UI to disconnect device");

        dispatch_configuration_status(
            &handle,
            ConfigurationStatus {
                device_key,
                successful: false,
                message: Some(
                    "Configuration timed out. Are you sure this is a Meshtastic device?".into(),
                ),
            },
        )
        .expect("Failed to dispatch configuration failure message");

        trace!("Told UI to disconnect device");
    });
}

pub fn spawn_decoded_handler(
    handle: tauri::AppHandle,
    mut decoded_listener: UnboundedReceiver<protobufs::FromRadio>,
    connected_devices_arc: state::MeshDevicesInner,
    graph_arc: state::NetworkGraphInner,
    device_key: DeviceKey,
) {
    tauri::async_runtime::spawn(async move {
        let handle = handle;

        while let Some(packet) = decoded_listener.recv().await {
            debug!("Received packet from device: {:?}", packet);

            let mut devices_guard = connected_devices_arc.lock().await;
            let device = match devices_guard
                .get_mut(&device_key)
                .ok_or("Device not initialized")
            {
                Ok(d) => d,
                Err(e) => {
                    warn!("{}", e);
                    continue;
                }
            };

            let mut graph_guard = graph_arc.lock().await;
            let graph = match graph_guard.as_mut().ok_or("Graph not initialized") {
                Ok(g) => g,
                Err(e) => {
                    warn!("{}", e);
                    continue;
                }
            };

            let update_result = match device.handle_packet_from_radio(packet) {
                Ok(result) => result,
                Err(err) => {
                    warn!("{}", err);
                    continue;
                }
            };

            if update_result.device_updated {
                match events::dispatch_updated_device(&handle, device) {
                    Ok(_) => (),
                    Err(e) => {
                        error!("Failed to dispatch device to client:\n{}", e);
                        continue;
                    }
                };
            }

            if update_result.regenerate_graph {
                graph.regenerate_graph_from_device_info(device);

                match events::dispatch_updated_edges(&handle, graph) {
                    Ok(_) => (),
                    Err(e) => {
                        error!("Failed to dispatch edges to client:\n{}", e);
                        continue;
                    }
                };
            }

            if update_result.configuration_success
                && device.status == DeviceConnectionStatus::Configured
            {
                debug!(
                    "Emitting successful configuration of device \"{}\"",
                    device_key.clone()
                );

                dispatch_configuration_status(
                    &handle,
                    ConfigurationStatus {
                        device_key: device_key.clone(),
                        successful: true,
                        message: None,
                    },
                )
                .expect("Failed to dispatch configuration success message");
                device.set_status(DeviceConnectionStatus::Connected);
            }

            if let Some(notification_config) = update_result.notification_config {
                match Notification::new(handle.config().tauri.bundle.identifier.clone())
                    .title(notification_config.title)
                    .body(notification_config.body)
                    .notify(&handle)
                {
                    Ok(_) => (),
                    Err(e) => {
                        error!("Failed to send system-level notification:\n{}", e);
                        continue;
                    }
                }
            }

            if update_result.rebooting {
                debug!("Device rebooting");
                dispatch_rebooting_event(&handle).expect("Failed to dispatch rebooting event");
            }
        }
    });
}
