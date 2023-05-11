use crate::analytics::algorithms::articulation_point::results::APResult;
use crate::analytics::algorithms::diffusion_centrality::results::DiffCenResult;
use crate::analytics::algorithms::stoer_wagner::results::MinCutResult;
use crate::analytics::state::configuration::AlgorithmConfigFlags;
use crate::device;
use crate::device::serial_connection::PacketDestination;
use crate::device::SerialDeviceStatus;
use crate::state;

use app::protobufs;
use log::{debug, error, trace};
use std::collections::HashMap;

use super::helpers;
use super::CommandError;
use super::DeviceBulkConfig;
use super::{events, APMincutStringResults};

#[tauri::command]
pub async fn request_autoconnect_port(
    autoconnect_state: tauri::State<'_, state::AutoConnectState>,
) -> Result<String, CommandError> {
    debug!("Called request_autoconnect_port command");

    let autoconnect_port_guard = autoconnect_state.inner.lock().await;
    let autoconnect_port = autoconnect_port_guard
        .as_ref()
        .ok_or("Autoconnect port state not initialized")?
        .clone();

    debug!("Returning autoconnect port {:?}", autoconnect_port);

    Ok(autoconnect_port)
}

#[tauri::command]
pub async fn initialize_graph_state(
    mesh_graph: tauri::State<'_, state::NetworkGraph>,
    algo_state: tauri::State<'_, state::AnalyticsState>,
) -> Result<(), CommandError> {
    debug!("Called initialize_graph_state command");
    helpers::initialize_graph_state(mesh_graph, algo_state).await
}

#[tauri::command]
pub fn get_all_serial_ports() -> Result<Vec<String>, CommandError> {
    debug!("Called get_all_serial_ports command");
    let ports = device::serial_connection::SerialConnection::get_available_ports()?;
    Ok(ports)
}

#[tauri::command]
pub async fn connect_to_serial_port(
    port_name: String,
    app_handle: tauri::AppHandle,
    connected_devices: tauri::State<'_, state::ConnectedDevices>,
    mesh_graph: tauri::State<'_, state::NetworkGraph>,
) -> Result<(), CommandError> {
    debug!(
        "Called connect_to_serial_port command with port \"{}\"",
        port_name
    );

    helpers::initialize_serial_connection_handlers(
        port_name,
        app_handle,
        connected_devices,
        mesh_graph,
    )
    .await
}

#[tauri::command]
pub async fn disconnect_from_serial_port(
    port_name: String,
    connected_devices: tauri::State<'_, state::ConnectedDevices>,
) -> Result<(), CommandError> {
    debug!("Called disconnect_from_serial_port command");

    {
        let mut state_devices = connected_devices.inner.lock().await;

        if let Some(device) = state_devices.get_mut(&port_name) {
            device.connection.disconnect().await?;
            device.set_status(SerialDeviceStatus::Disconnected);
        }

        state_devices.remove(&port_name);
    }

    Ok(())
}

#[tauri::command]
pub async fn disconnect_from_all_serial_ports(
    connected_devices: tauri::State<'_, state::ConnectedDevices>,
) -> Result<(), CommandError> {
    debug!("Called disconnect_from_all_serial_ports command");

    {
        let mut state_devices = connected_devices.inner.lock().await;

        // Disconnect from all serial ports
        for (port_name, device) in state_devices.iter_mut() {
            trace!("Disconnecting from device on port {}", port_name);

            device.connection.disconnect().await?;
            device.set_status(SerialDeviceStatus::Disconnected);
        }

        // Clear connections map
        state_devices.clear();
    }

    Ok(())
}

#[tauri::command]
pub async fn send_text(
    port_name: String,
    text: String,
    channel: u32,
    app_handle: tauri::AppHandle,
    connected_devices: tauri::State<'_, state::ConnectedDevices>,
) -> Result<(), CommandError> {
    debug!("Called send_text command",);
    trace!("Called with text {} on channel {}", text, channel);

    let mut devices_guard = connected_devices.inner.lock().await;
    let device = devices_guard
        .get_mut(&port_name)
        .ok_or("Device not connected")?;

    device
        .send_text(text.clone(), PacketDestination::Broadcast, true, channel)
        .await?;

    events::dispatch_updated_device(&app_handle, device).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn update_device_config(
    port_name: String,
    config: protobufs::Config,
    connected_devices: tauri::State<'_, state::ConnectedDevices>,
) -> Result<(), CommandError> {
    debug!("Called update_device_config command");
    trace!("Called with config {:?}", config);

    let mut devices_guard = connected_devices.inner.lock().await;
    let device = devices_guard
        .get_mut(&port_name)
        .ok_or("Device not connected")?;

    device.update_device_config(config).await?;

    Ok(())
}

#[tauri::command]
pub async fn update_device_user(
    port_name: String,
    user: protobufs::User,
    mesh_device: tauri::State<'_, state::ConnectedDevices>,
) -> Result<(), CommandError> {
    debug!("Called update_device_user command");
    trace!("Called with user {:?}", user);

    let mut devices_guard = mesh_device.inner.lock().await;
    let device = devices_guard
        .get_mut(&port_name)
        .ok_or("Device not connected")?;

    device.update_device_user(user).await?;

    Ok(())
}

#[tauri::command]
pub async fn send_waypoint(
    port_name: String,
    waypoint: protobufs::Waypoint,
    channel: u32,
    app_handle: tauri::AppHandle,
    mesh_device: tauri::State<'_, state::ConnectedDevices>,
) -> Result<(), CommandError> {
    debug!("Called send_waypoint command");
    trace!("Called on channel {} with waypoint {:?}", channel, waypoint);

    let mut devices_guard = mesh_device.inner.lock().await;
    let device = devices_guard
        .get_mut(&port_name)
        .ok_or("Device not connected")
        .map_err(|e| e.to_string())?;

    device
        .send_waypoint(waypoint, PacketDestination::Broadcast, true, channel)
        .await?;

    events::dispatch_updated_device(&app_handle, device).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_node_edges(
    mesh_graph: tauri::State<'_, state::NetworkGraph>,
) -> Result<geojson::FeatureCollection, CommandError> {
    debug!("Called get_node_edges command");

    let mut guard = mesh_graph.inner.lock().await;
    let graph = guard.as_mut().ok_or("Graph edges not initialized")?;

    let edges = helpers::generate_graph_edges_geojson(graph);

    trace!("Found edges {:?}", edges);

    Ok(edges)
}

#[tauri::command]
pub async fn run_algorithms(
    flags: AlgorithmConfigFlags,
    mesh_graph: tauri::State<'_, state::NetworkGraph>,
    algo_state: tauri::State<'_, state::AnalyticsState>,
) -> Result<APMincutStringResults, CommandError> {
    debug!("Called run_algorithms command");
    trace!("Running algorithms with flags {:?}", flags);

    let mut guard = mesh_graph.inner.lock().await;
    let mut state_guard = algo_state.inner.lock().await;

    let graph_struct = guard.as_mut().ok_or("Graph not initialized")?;
    let state = state_guard.as_mut().ok_or("State not initialized")?;

    state.add_graph_snapshot(&graph_struct.graph);
    state.set_algorithm_flags(flags);
    state.run_algos();

    let algo_result = state.get_algo_results();

    debug!("Received algorithm results: {:?}", algo_result);

    // convert AP from a vector of NodeIndexes to a vector of IDs (strings)
    let ap_vec: Vec<u32> = match &algo_result.aps {
        APResult::Success(aps) => aps
            .iter()
            .filter_map(|nodeindex| helpers::node_index_to_node_id(nodeindex, &graph_struct.graph))
            .collect(),
        APResult::Error(err) => return Err(err.to_owned().into()),
        APResult::Empty(_) => vec![],
    };

    // convert mincut from a vector of Edges to a vector of string pairs
    let mincut_vec: Vec<(u32, u32)> = match &algo_result.mincut {
        MinCutResult::Success(aps) => aps
            .iter()
            .filter_map(|edge| {
                let u_res = helpers::node_index_to_node_id(&edge.get_u(), &graph_struct.graph)?;
                let v_res = helpers::node_index_to_node_id(&edge.get_v(), &graph_struct.graph)?;
                Some((u_res, v_res))
            })
            .collect(),
        MinCutResult::Error(err) => return Err(err.to_owned().into()),
        MinCutResult::Empty(_) => vec![],
    };

    let diffcen_maps: HashMap<u32, HashMap<u32, HashMap<u32, f64>>> = match &algo_result.diff_cent {
        DiffCenResult::Success(diff_cen_res) => diff_cen_res
            .iter()
            .map(|(key, val)| {
                let key = key.parse::<u32>().unwrap_or(0);
                let val = val
                    .iter()
                    .map(|(k, v)| {
                        let k = k.parse::<u32>().unwrap_or(0);
                        let v: HashMap<u32, f64> = v
                            .iter()
                            .map(|(k1, v1)| {
                                let k1 = k1.parse::<u32>().unwrap_or(0);
                                (k1, *v1)
                            })
                            .collect();
                        (k, v)
                    })
                    .collect();
                (key, val)
            })
            .collect(),
        DiffCenResult::Error(err) => {
            error!("{:?}", err);
            return Err("Diffusion centrality algorithm failed".into());
        }
        DiffCenResult::Empty(_) => HashMap::new(),
    };

    Ok(APMincutStringResults {
        ap_result: ap_vec,
        mincut_result: mincut_vec,
        diffcen_result: diffcen_maps,
    })
}

// UNUSED
#[tauri::command]
pub async fn start_configuration_transaction(
    port_name: String,
    mesh_device: tauri::State<'_, state::ConnectedDevices>,
) -> Result<(), CommandError> {
    debug!("Called start_configuration_transaction command");

    let mut devices_guard = mesh_device.inner.lock().await;
    let device = devices_guard
        .get_mut(&port_name)
        .ok_or("Device not connected")
        .map_err(|e| e.to_string())?;

    device.start_configuration_transaction().await?;

    Ok(())
}

// UNUSED
#[tauri::command]
pub async fn commit_configuration_transaction(
    port_name: String,
    mesh_device: tauri::State<'_, state::ConnectedDevices>,
) -> Result<(), CommandError> {
    debug!("Called commit_configuration_transaction command");

    let mut devices_guard = mesh_device.inner.lock().await;
    let device = devices_guard
        .get_mut(&port_name)
        .ok_or("Device not connected")
        .map_err(|e| e.to_string())?;

    device.commit_configuration_transaction().await?;

    Ok(())
}

#[tauri::command]
pub async fn update_device_config_bulk(
    port_name: String,
    app_handle: tauri::AppHandle,
    config: DeviceBulkConfig,
    mesh_device: tauri::State<'_, state::ConnectedDevices>,
) -> Result<(), CommandError> {
    debug!("Called commit_configuration_transaction command");

    let mut devices_guard = mesh_device.inner.lock().await;
    let device = devices_guard
        .get_mut(&port_name)
        .ok_or("Device not connected")
        .map_err(|e| e.to_string())?;

    device.start_configuration_transaction().await?;

    if let Some(radio_config) = config.radio {
        device.set_local_config(radio_config).await?;
    }

    if let Some(module_config) = config.module {
        device.set_local_module_config(module_config).await?;
    }

    if let Some(channel_config) = config.channels {
        device.set_channel_config(channel_config).await?;
    }

    device.commit_configuration_transaction().await?;

    events::dispatch_updated_device(&app_handle, device).map_err(|e| e.to_string())?;

    Ok(())
}
