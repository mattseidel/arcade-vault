import { FaGlobe } from "@react-icons/all-files/fa/FaGlobe";
import { FaHeart } from "@react-icons/all-files/fa/FaHeart";
import { FaSeedling } from "@react-icons/all-files/fa/FaSeedling";

export type HighlightKind = "HEART" | "BROWSER" | "PLANT";

const ICONS = { HEART: FaHeart, BROWSER: FaGlobe, PLANT: FaSeedling };

export function HighlightIcon({ kind }: { kind: HighlightKind }) {
  const Icon = ICONS[kind];
  return <Icon className="hl-icon" aria-hidden="true" />;
}
