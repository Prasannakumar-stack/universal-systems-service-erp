export const ADMIN_ASSIGNMENT_LABEL = 'Admin';

export function technicianNameOrAdmin(record) {
  return (
    record?.technicianId?.name
    || record?.technician?.name
    || record?.technicianName
    || record?.assignedTechnician?.name
    || ADMIN_ASSIGNMENT_LABEL
  );
}
