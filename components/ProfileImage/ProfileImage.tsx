import Image from "next/image";

type ProfileImageProps = {
  size: "small" | "large";
};

export default function ProfileImage({ size }: ProfileImageProps) {
  const dimensions = size === "large" ? 64 : 24;
  return (
    <Image
      width={dimensions}
      height={dimensions}
      src="/images/profile-pic.webp"
      alt="profile picture"
      style={{
        borderRadius: "50%",
      }}
      loading="lazy"
    />
  );
}
