import { Osori } from "./Osori";

/** 동그란 프로필. 사진을 안 올린 사람은 오소리가 기본이다 */
export function Avatar({ url, size = 84 }: { url: string | null; size?: number }) {
  return (
    <span className="relative block shrink-0 overflow-hidden rounded-full border-2 border-line bg-yellow-soft" style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="내 프로필 사진" className="size-full object-cover" />
      ) : (
        <Osori mood="basic" size={Math.round(size * 0.86)} alt="오소리 기본 프로필" className="absolute -bottom-[6%] left-1/2 -translate-x-1/2" />
      )}
    </span>
  );
}
