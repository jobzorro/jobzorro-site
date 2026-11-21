// 투잡 엔진 플러그인 목록(정적 import). 각 파일이 export default null 이면 건너뛴다.
// 새 투잡을 붙일 때 이 파일은 고치지 않는다. engine/jobs/<key>.js 만 채운다. 규약: engine/jobs/README.md
import tarot from "./tarot.js";
import webnovel from "./webnovel.js";
import tutoring from "./tutoring.js";
import chicken from "./chicken.js";
import vibe from "./vibe.js";
export const PLUGINS = [tarot, webnovel, tutoring, chicken, vibe].filter(Boolean);
