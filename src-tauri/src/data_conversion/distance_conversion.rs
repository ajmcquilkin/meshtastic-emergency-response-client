use crate::data_conversion::distance_constants::{
    ALT_CONVERSION_FACTOR, LAT_CONVERSION_FACTOR, LON_CONVERSION_FACTOR, RADIUS_EARTH_KM,
};
use crate::device::MeshNode;

/*
* Calculates the distance between two points on a sphere using helpers in graph snapshot
* Returns distance in kilometers
*
* Conversion function:
* Lat/Long: 1e-7 conversion from int to floating point degrees; see mesh.proto
* Altitude: in meters above sea level, no conversion needed
*/
pub fn get_spherical_distance(node_1: Option<&MeshNode>, node_2: Option<&MeshNode>) -> Option<f64> {
    match (node_1, node_2) {
        (Some(node_1), Some(node_2)) => {
            let node_1_pos = &node_1.position_metrics.last();
            let node_2_pos = &node_2.position_metrics.last();

            match (node_1_pos, node_2_pos) {
                (Some(node_1_pos), Some(node_2_pos)) => Some(total_distance(
                    node_1_pos.latitude as f64 * LAT_CONVERSION_FACTOR,
                    node_1_pos.longitude as f64 * LON_CONVERSION_FACTOR,
                    node_1_pos.altitude as f64 * ALT_CONVERSION_FACTOR,
                    node_2_pos.latitude as f64 * LAT_CONVERSION_FACTOR,
                    node_2_pos.longitude as f64 * LON_CONVERSION_FACTOR,
                    node_2_pos.altitude as f64 * ALT_CONVERSION_FACTOR,
                )),
                _ => None,
            }
        }
        _ => None,
    }
}

/// Returns total distance between 2 nodes using euclidean of haversine and altitude difference.
///
/// # Arguments
///
/// * `lat1` - latitude of node 1
/// * `lon1` - longitude of node 1
/// * `alt1` - altitude of node 1
/// * `lat2` - latitude of node 2
/// * `lon2` - longitude of node 2
/// * `alt2` - altitude of node 2
pub fn total_distance(lat1: f64, lon1: f64, alt1: f64, lat2: f64, lon2: f64, alt2: f64) -> f64 {
    let haversine_distance = haversine_distance(lat1, lon1, lat2, lon2).powi(2);
    let alt_difference = (alt1 - alt2).powi(2);
    (haversine_distance + alt_difference).sqrt()
}

/// Returns Haversine distance between 2 nodes using their lat and long
/// https://en.wikipedia.org/wiki/Haversine_formula
///
/// # Arguments
///
/// * `lat1` - latitude of node 1
/// * `lon1` - longitude of node 1
/// * `lat2` - latitude of node 2
/// * `lon2` - longitude of node 2
fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = RADIUS_EARTH_KM;
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let a = (d_lat / 2.0).sin().powi(2)
        + (d_lon / 2.0).sin().powi(2) * lat1.to_radians().cos() * lat2.to_radians().cos();
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    r * c
}
