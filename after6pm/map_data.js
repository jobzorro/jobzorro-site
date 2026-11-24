// 도시 맵 그림과 핀 좌표(11-24). 그림은 피그마 파일 A20w2DNj7CQSe4FxlzPYLt(맵 11:7~11:11, 오피스 11:2~11:6)와 같은 톤. 다섯 맵의 구도가 같아 핀은 한 벌이다.
export const MAP = {
  w: 1024, h: 1536,
  files: { spring: "img/map/map_spring.webp", summer: "img/map/map_summer.webp", fall: "img/map/map_fall.webp", winter: "img/map/map_winter.webp", xmas: "img/map/map_xmas.webp" },
  // 왼쪽 위 기준 %. 핀의 아래 끝이 이 점에 온다
  pins: { office: [44, 20], officest: [15, 14], seminar: [8, 26], newtown: [80, 17], cafe: [14, 43], hotplace: [52, 36], pub: [40, 50], univ: [80, 43], gym: [12, 66], home: [46, 70], library: [85, 64], realty: [11, 80], hobby: [74, 80] },
  partySpot: [44, 28],
  // 11-25 회사 자리는 회사 종류마다 다르다(이직하면 옮겨 간다). 없는 종류는 pins.office. 회식 핀(partySpots)은 회사 자리 바로 아래
  // 자리: 대기업 = 가운데 타워, 금융권 = 다리 옆 고층, 중견 = 타워 왼쪽 사옥, 공기업 = 아래쪽 주택가, 스타트업 = 성숲길 끝. 오른쪽 가운데(신도시~대학가 사이)는 핀이 겹쳐서 비워 둔다
  coPins: { big: [44, 20], fin: [57, 16], mid: [29, 24], public: [44, 84], startup: [60, 49] },
  partySpots: { big: [35, 31], fin: [67, 28], mid: [31, 35], public: [46, 96], startup: [62, 61] },
  myShop: [30, 58], // 퇴사·해고 뒤 '내 가게·작업실' 핀(하는 투잡이 있을 때)
  office: { big: "img/map/office_big.webp", fin: "img/map/office_fin.webp", mid: "img/map/office_mid.webp", startup: "img/map/office_startup.webp", public: "img/map/office_public.webp" },
};
