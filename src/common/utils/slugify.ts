export default function slugify(input: string): string {
  return input
    .toLowerCase() // Convert to lowercase
    .trim() // Remove whitespace from both ends
    .replace(/[^a-z0-9\s-]/g, "") // Remove all non-alphanumeric characters except space and hyphen
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Remove multiple consecutive hyphens
}
