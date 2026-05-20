const officerRepository = require('../../Database/repositories/officerRepository');

const findAvailableOfficer = async () => {
  try {
    const available = await officerRepository.getAvailableOfficers();
    if (available && available.length > 0) {
      // Pick the first available officer
      return {
        id: available[0].id,
        name: available[0].full_name,
        phone: available[0].phone_number || "+919999999999",
        status: available[0].availability_status
      };
    }
  } catch (err) {
    console.error('Error fetching officers:', err);
  }

  // fallback if none found
  return {
    id: 1,
    name: "Officer Ravi (Fallback)",
    phone: "+919999999999",
    status: "AVAILABLE",
  };
};

module.exports = {
  findAvailableOfficer,
};