// 도시 맵 그림과 핀 좌표(11-24). 그림은 피그마 파일 A20w2DNj7CQSe4FxlzPYLt(맵 11:7~11:11, 오피스 11:2~11:6)와 같은 톤. 다섯 맵의 구도가 같아 핀은 한 벌이다.
export const MAP = {
  w: 1024, h: 1536,
  files: { spring: "img/map/map_spring.webp", summer: "img/map/map_summer.webp", fall: "img/map/map_fall.webp", winter: "img/map/map_winter.webp", xmas: "img/map/map_xmas.webp" },
  // 왼쪽 위 기준 %. 핀의 아래 끝이 이 점에 온다
  pins: { office: [44, 20], officest: [15, 14], seminar: [8, 26], newtown: [80, 17], cafe: [14, 43], hotplace: [52, 36], pub: [40, 50], univ: [80, 43], gym: [12, 66], home: [46, 70], library: [85, 64], realty: [11, 80], hobby: [74, 80] },
  partySpot: [44, 27],
  office: { big: "img/map/office_big.webp", fin: "img/map/office_fin.webp", mid: "img/map/office_mid.webp", startup: "img/map/office_startup.webp", public: "img/map/office_public.webp" },
};
