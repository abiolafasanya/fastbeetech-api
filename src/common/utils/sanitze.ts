export default function deepSanitize(obj: any) {
  if (typeof obj !== "object" || obj === null) return;

  for (const key in obj) {
    if (key.includes("$") || key.includes(".")) {
      delete obj[key];
    } else if (typeof obj[key] === "object") {
      deepSanitize(obj[key]);
    }
  }
}
