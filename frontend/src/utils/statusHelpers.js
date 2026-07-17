export function getStatusColor(status) {
  if (!status) return "bg-gray-100 text-gray-800";
  switch (String(status).toUpperCase()) {
    case "YET_TO_BE_VERIFIED":
      return "bg-yellow-100 text-yellow-800";
    case "LIVE":
      return "bg-green-100 text-green-800";
    case "UPCOMING":
      return "bg-blue-100 text-blue-800";
    case "ENDED":
      return "bg-gray-100 text-gray-800";
    case "CANCELLED":
    case "REMOVED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getStatusLabel(status) {
  if (!status) return "N/A";
  switch (status) {
    case "YET_TO_BE_VERIFIED":
      return "Yet to be Verified";
    case "REMOVED":
      return "Removed";
    default:
      return status || "N/A";
  }
}
