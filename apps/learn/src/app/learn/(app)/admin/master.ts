import "server-only";

/* The master admin is the one account allowed to change roles (other admins keep every other power).
   Set MASTER_ADMIN_EMAIL in the server env. The literal fallback keeps today's owner working until that
   variable is on the VPS; once it is, delete the fallback so a missing env fails closed (nobody can change roles). */
const FALLBACK_MASTER = "trailingtrades@gmail.com";
export const masterAdminEmail = () => (process.env.MASTER_ADMIN_EMAIL || FALLBACK_MASTER).trim().toLowerCase();
export const isMasterAdmin = (email: string | null | undefined) => !!email && email.trim().toLowerCase() === masterAdminEmail();
