import Image from "next/image";
import type { ResultStatus } from "@/types";

const PORTRAIT_COUNT = 11;

export function EmployeeAvatar({
  code,
  status,
  size = 32,
}: {
  code: string;
  status: ResultStatus;
  size?: number;
}) {
  let index = 0;
  for (const character of code) {
    index = (index * 31 + character.charCodeAt(0)) % PORTRAIT_COUNT;
  }
  const file =
    status === "calculated" ? `portrait-${index + 1}.png` : "insufficient-evidence.svg";

  return (
    <Image
      className="avatar"
      src={`/people/${file}`}
      width={size}
      height={size}
      alt=""
      unoptimized
    />
  );
}
