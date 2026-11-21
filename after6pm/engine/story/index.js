// 기존 투잡 5개(pr·cs·insta·airbnb·ucafe) 이야기 보강 목록. 규약: engine/story/README.md
// 이 파일은 고치지 않는다. 각 파일이 export default null 이면 건너뛴다.
import pr from "./pr.js";
import cs from "./cs.js";
import insta from "./insta.js";
import airbnb from "./airbnb.js";
import ucafe from "./ucafe.js";
export const STORIES = [pr, cs, insta, airbnb, ucafe].filter(Boolean);
