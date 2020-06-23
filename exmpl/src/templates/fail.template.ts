export const failAppointment = (payload: string, message: string) => `
Dear Service Desk,

the following appointment failed to be created. Please check and verify.
Requested Appointment:
${payload}
Error occurred:
${message}

Best Regards,

GaaS
`;
