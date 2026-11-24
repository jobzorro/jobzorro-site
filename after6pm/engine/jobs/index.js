// 투잡 엔진 플러그인 목록(정적 import). 각 파일이 export default null 이면 건너뛴다.
// 새 투잡을 붙일 때 이 파일은 고치지 않는다. engine/jobs/<key>.js 만 채운다. 규약: engine/jobs/README.md
import tarot from "./tarot.js";
import webnovel from "./webnovel.js";
import tutoring from "./tutoring.js";
import chicken from "./chicken.js";
import vibe from "./vibe.js";
import club from "./club.js"; // 11-23 취미 모임
import petsit from "./petsit.js"; // 11-24 방문 펫시팅
import { PETSIT_ON, SIDEJOBS } from "../defs.js";
if (!PETSIT_ON) delete SIDEJOBS.petsit; // 숨기는 동안에는 투잡 탐색 목록에서도 뺀다
export const PLUGINS = [tarot, webnovel, tutoring, chicken, vibe, club, PETSIT_ON ? petsit : null].filter(Boolean);
