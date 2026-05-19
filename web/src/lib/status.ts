export type StatusCode = 301 | 302 | 303 | 307 | 308;

export const STATUS_CODES: StatusCode[] = [301, 302, 303, 307, 308];

type StatusMeta = {
  code: StatusCode;
  short: string;
  label: string;
  desc: string;
  kind: "permanent" | "temporary";
};

export const STATUS: Record<StatusCode, StatusMeta> = {
  301: { code: 301, short: "Perm", label: "Moved Permanently", desc: "301 · cached by browsers, hard to change later", kind: "permanent" },
  302: { code: 302, short: "Temp", label: "Found", desc: "302 · temporary, safe default", kind: "temporary" },
  303: { code: 303, short: "See", label: "See Other", desc: "303 · forces GET on next request", kind: "temporary" },
  307: { code: 307, short: "Temp*", label: "Temporary Redirect", desc: "307 · temporary, preserves method/body", kind: "temporary" },
  308: { code: 308, short: "Perm*", label: "Permanent Redirect", desc: "308 · permanent, preserves method/body", kind: "permanent" },
};

export function statusMeta(code: number): StatusMeta {
  return STATUS[code as StatusCode] ?? STATUS[302];
}
