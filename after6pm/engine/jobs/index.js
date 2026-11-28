// 투잡 엔진 플러그인 목록(정적 import). 각 파일이 export default null 이면 건너뛴다.
// 새 투잡을 붙일 때 이 파일은 고치지 않는다. engine/jobs/<key>.js 만 채운다. 규약: engine/jobs/README.md
import tarot from "./tarot.js";
import webnovel from "./webnovel.js";
import tutoring from "./tutoring.js";
import chicken from "./chicken.js";
import vibe from "./vibe.js";
import club from "./club.js"; // 11-23 취미 모임
import petsit from "./petsit.js"; // 11-24 방문 펫시팅
import carwash from "./carwash.js"; // 11-27 출장 세차(만드는 중, 스위치 CARWASH_ON)
import buying from "./buying.js"; // 11-27 해외 구매대행(만드는 중, 스위치 BUYING_ON)
import { PETSIT_ON, CARWASH_ON, BUYING_ON, SIDEJOBS, HOBBIES } from "../defs.js";
if (!CARWASH_ON || !carwash) delete SIDEJOBS.carwash;
else for (const k of ["camp", "run"]) if (HOBBIES[k]?.jobs && !HOBBIES[k].jobs.includes("carwash")) HOBBIES[k].jobs.push("carwash"); // 11-28 켜져 있을 때만 캠핑·러닝크루에서 세차 이야기를 듣는다
if (!BUYING_ON || !buying) delete SIDEJOBS.buying;
if (!PETSIT_ON) { delete SIDEJOBS.petsit; for (const h of Object.values(HOBBIES)) if (h.jobs) h.jobs = h.jobs.filter((j) => j !== "petsit"); } // 숨기는 동안에는 투잡 탐색 목록·취미 연결에서도 뺀다(11-26)
export const PLUGINS = [tarot, webnovel, tutoring, chicken, vibe, club, PETSIT_ON ? petsit : null, CARWASH_ON ? carwash : null, BUYING_ON ? buying : null].filter(Boolean);
