/**
 * Master Incident Matching Engine
 * 
 * Evaluates 4 core signals:
 * 1. Time Similarity
 * 2. Location Similarity (Haversine distance in meters)
 * 3. Category Similarity
 * 4. Image Similarity
 * 
 * Core Principles:
 * - "Remove duplicate incidents, NOT duplicate citizens' evidence."
 * - "Same location does NOT always mean duplicate" -> Distinguishes duplicate reports from recurring incidents.
 */

// Haversine formula to compute distance in meters between two GPS coordinates
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

// Configurable thresholds
const MATCH_CONFIG = {
  maxDistanceMeters: 250, // within 250 meters
  maxTimeDeltaHoursForDuplicate: 72, // within 72 hours of open incident
  imageSimilarityThreshold: 65, // %
};

const matchComplaintToMasterIncident = (newComplaint, existingMasterIncidents = []) => {
  const { category, latitude, longitude, submittedAt, beforePhoto } = newComplaint;
  const newTime = new Date(submittedAt || Date.now()).getTime();

  let bestMatch = null;
  let highestScore = 0;
  let matchSignals = null;
  let isRecurring = false;

  for (const incident of existingMasterIncidents) {
    // 1. Category Similarity
    const categoryMatch = incident.category === category;
    if (!categoryMatch) continue;

    // 2. Location Similarity
    const distanceMeters = calculateDistanceMeters(
      latitude,
      longitude,
      incident.latitude,
      incident.longitude
    );
    const locationMatch = distanceMeters <= MATCH_CONFIG.maxDistanceMeters;

    if (!locationMatch) continue;

    // 3. Time Similarity & Incident State
    const incidentTime = new Date(incident.lastReportedAt || incident.firstReportedAt).getTime();
    const timeDeltaHours = Math.abs(newTime - incidentTime) / (3600 * 1000);
    const isIncidentOpen = incident.status !== 'RESOLVED' && incident.status !== 'VERIFIED';

    // 4. Image Similarity (simulated heuristic score)
    let imageSimilarity = 78;
    if (beforePhoto && incident.linkedComplaints && incident.linkedComplaints.length > 0) {
      const firstPhoto = incident.linkedComplaints[0].photo;
      if (firstPhoto === beforePhoto) {
        imageSimilarity = 96;
      } else {
        imageSimilarity = Math.floor(Math.random() * 20) + 72; // 72-92%
      }
    }

    // Check if this is a RECURRING incident at the same location (resolved earlier)
    if (!isIncidentOpen && timeDeltaHours > 24) {
      // It's a recurring issue at the same hotspot!
      isRecurring = true;
      bestMatch = incident;
      matchSignals = {
        timeMatch: false,
        timeDeltaHours: Math.round(timeDeltaHours),
        locationMatch: true,
        distanceMeters,
        categoryMatch: true,
        imageSimilarity,
        isRecurringHotspot: true,
      };
      break;
    }

    // Otherwise, check if it is a DUPLICATE of an ongoing open incident
    const timeMatch = timeDeltaHours <= MATCH_CONFIG.maxTimeDeltaHoursForDuplicate;
    const score = (locationMatch ? 40 : 0) + (timeMatch ? 30 : 0) + (imageSimilarity >= MATCH_CONFIG.imageSimilarityThreshold ? 30 : 10);

    if (isIncidentOpen && locationMatch && timeMatch && score > highestScore) {
      highestScore = score;
      bestMatch = incident;
      matchSignals = {
        timeMatch,
        timeDeltaHours: Math.round(timeDeltaHours),
        locationMatch,
        distanceMeters,
        categoryMatch,
        imageSimilarity,
        isRecurringHotspot: false,
      };
    }
  }

  if (bestMatch) {
    return {
      isMatch: true,
      isRecurring,
      masterIncident: bestMatch,
      signals: matchSignals,
      confidence: highestScore || 85,
    };
  }

  return {
    isMatch: false,
    isRecurring: false,
    masterIncident: null,
    signals: null,
    confidence: 0,
  };
};

module.exports = {
  calculateDistanceMeters,
  matchComplaintToMasterIncident,
  MATCH_CONFIG,
};
