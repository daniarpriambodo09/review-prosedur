// lib/ownerParts.ts

export function splitOwnerParts(owner: string | null | undefined): string[] {
  if (!owner) return [];
  return owner
    .split(/[,&]/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function ownerMatchesSection(owner: string | null | undefined, sectionNama: string): boolean {
  return splitOwnerParts(owner).includes(sectionNama);
}

export function replaceOwnerPart(owner: string, oldNama: string, newNama: string): string {
  const parts = splitOwnerParts(owner);
  const idx = parts.indexOf(oldNama);
  if (idx === -1) return owner;
  parts[idx] = newNama;
  return parts.join(', ');
}