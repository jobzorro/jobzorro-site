// 투잡 화면 플러그인 목록(정적 import). 각 파일이 export default null 이면 건너뛴다.
// 새 투잡을 붙일 때 이 파일은 고치지 않는다. jobs/<key>_ui.js 만 채운다. 규약: engine/jobs/README.md
import tarot from "./tarot_ui.js";
import webnovel from "./webnovel_ui.js";
import tutoring from "./tutoring_ui.js";
import chicken from "./chicken_ui.js";
import vibe from "./vibe_ui.js";
import club from "./club_ui.js"; // 11-23 취미 모임
import petsit from "./petsit_ui.js"; // 11-24 방문 펫시팅
import carwash from "./carwash_ui.js"; // 11-27 출장 세차
import buying from "./buying_ui.js"; // 11-27 해외 구매대행
import { PETSIT_ON, CARWASH_ON, BUYING_ON } from "../engine/defs.js";
export const UI_PLUGINS = [tarot, webnovel, tutoring, chicken, vibe, club, PETSIT_ON ? petsit : null, CARWASH_ON ? carwash : null, BUYING_ON ? buying : null].filter(Boolean);
