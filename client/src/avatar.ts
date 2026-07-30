/** Builds a DiceBear avatar URL. Falls back to the user's id when no seed has been assigned yet. */
export function avatarUrl(user: { id: string; avatarSeed: string | null }): string {
  const seed = user.avatarSeed ?? user.id;
  return `https://api.dicebear.com/10.x/adventurer-neutral/svg?scale=1.01&backgroundColor=ecad80,9e5622&seed=${encodeURIComponent(seed)}`;
}
