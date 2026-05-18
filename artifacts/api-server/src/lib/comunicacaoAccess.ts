const INSTITUTION_COMMUNICATION_PATH = /\/comunicacao\/institution(?:\/|$)/;

export function isInstitutionCommunicationPath(url: string | undefined): boolean {
  const path = (url ?? "").split("?")[0] ?? "";
  return INSTITUTION_COMMUNICATION_PATH.test(path);
}

export function hasInstitutionCommunicationRole(
  appRole: string | null | undefined,
  institutionRole: string | null | undefined,
  institutionApproved: boolean | null | undefined,
): boolean {
  return ["institution_admin", "teacher"].includes(appRole ?? "")
    || (!!institutionApproved && ["owner", "admin", "teacher"].includes(institutionRole ?? ""));
}
