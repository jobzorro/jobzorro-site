/**
 * 취업조로 무료 상담 신청 폼 -> 구글 시트 접수 스크립트
 *
 * 설치 (약 5분, google/README.md 참고):
 *  1. 구글 시트를 하나 만든다 (예: "취업조로 상담신청"). 첫 시트 이름은 그대로 둬도 된다.
 *  2. 메뉴 확장 프로그램 > Apps Script 를 열고 이 파일 내용을 전부 붙여 넣는다.
 *  3. 아래 NOTIFY_EMAIL 에 알림 받을 메일 주소를 넣는다 (비우면 알림 없음).
 *  4. 배포 > 새 배포 > 유형 "웹 앱" > 실행 사용자 "나" > 액세스 권한 "모든 사용자" > 배포.
 *  5. 나오는 웹 앱 URL(https://script.google.com/macros/s/.../exec)을 job-dictionary/data/site.json 의 formEndpoint 에 넣고
 *     python build.py 로 다시 빌드한다.
 *  * 스크립트를 고친 뒤에는 배포 > 배포 관리 > 연필 > 버전 "새 버전" 으로 다시 배포해야 반영된다.
 */

var NOTIFY_EMAIL = "";          // 예: "zorr0@naver.com" — 신청이 들어오면 이 주소로 메일 알림
var SHEET_NAME   = "상담신청";   // 이 이름의 시트가 없으면 자동으로 만든다

// 폼에서 보내는 필드 순서 = 시트 열 순서
var COLUMNS = [
  ["접수시각",        "_received"],
  ["취업형태",        "type"],      // 신입 / 중고신입 / 경력(이직) / 경력(선퇴사자)
  ["성함",            "name"],
  ["연락처",          "phone"],
  ["신청사유",        "reason"],
  ["재직여부·연차",   "status"],
  ["지원직무",        "job"],
  ["사는곳",          "region"],
  ["고민·궁금한점",   "message"],
  ["개인정보동의",    "consent"],
  ["직무사전 직무ID", "jobId"],
  ["신청페이지",      "page"],
  ["처리상태",        "_status"]    // 담당자가 시트에서 직접 적는 칸 (예: 연락완료 / 상담예약 / 종료)
];

function doPost(e) {
  try {
    var data = parseBody_(e);
    if (data.website) {                      // 봇이 채우는 숨은 칸(허니팟)이 채워져 있으면 조용히 무시
      return json_({ ok: true });
    }
    if (!data.name || !data.phone) {
      return json_({ ok: false, error: "이름과 휴대폰은 필수입니다" });
    }
    var sheet = getSheet_();
    var now = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
    data._received = now;
    data._status = "신규";
    var row = COLUMNS.map(function (c) { return String(data[c[1]] == null ? "" : data[c[1]]); });
    sheet.appendRow(row);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: "[취업조로 상담신청] " + data.name + " · " + (data.type || "") + " · " + (data.job || ""),
        body: COLUMNS.map(function (c) { return c[0] + ": " + (data[c[1]] || ""); }).join("\n") +
              "\n\n시트: " + SpreadsheetApp.getActiveSpreadsheet().getUrl()
      });
    }
    return json_({ ok: true, received: now });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 브라우저에서 URL을 직접 열었을 때 살아 있는지 확인용
function doGet() {
  return json_({ ok: true, service: "jobzorro-consult-form", columns: COLUMNS.map(function (c) { return c[0]; }) });
}

function parseBody_(e) {
  // 폼은 CORS 사전요청을 피하려고 text/plain 으로 JSON 문자열을 보낸다. 일반 form-urlencoded 도 받는다.
  if (e && e.postData && e.postData.contents) {
    var raw = e.postData.contents;
    try { return JSON.parse(raw); } catch (ignore) {}
  }
  return (e && e.parameter) || {};
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUMNS.map(function (c) { return c[0]; }));
    sh.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold").setBackground("#000000").setFontColor("#ffffff");
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 편집기에서 ▶ 실행해 보면 시트에 테스트 행이 하나 들어간다 (처음 한 번 권한 승인 창이 뜬다)
function testInsert() {
  var fake = { postData: { contents: JSON.stringify({ type: "신입", name: "테스트", phone: "010-0000-0000", reason: "테스트 접수", status: "신입", job: "서비스 기획", region: "서울", message: "테스트", consent: "동의", page: "test" }) } };
  Logger.log(doPost(fake).getContent());
}
