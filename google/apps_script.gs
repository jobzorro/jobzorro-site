/**
 * 취업조로 무료 상담 신청 폼 -> 구글 시트 접수 + 알림(이메일 / 카카오톡) 스크립트
 *
 * 설치 (약 5분, google/README.md 참고):
 *  1. 구글 시트를 하나 만든다 (예: "취업조로 상담신청"). 첫 시트 이름은 그대로 둬도 된다.
 *  2. 메뉴 확장 프로그램 > Apps Script 를 열고 이 파일 내용을 전부 붙여 넣는다.
 *  3. 아래 NOTIFY_EMAIL 에 알림 받을 메일 주소를 넣는다 (비우면 메일 알림 없음).
 *  4. 배포 > 새 배포 > 유형 "웹 앱" > 실행 사용자 "나" > 액세스 권한 "모든 사용자" > 배포.
 *  5. 나오는 웹 앱 URL(https://script.google.com/macros/s/.../exec)을 job-dictionary/data/site.json 의 formEndpoint 에 넣고
 *     python build.py 로 다시 빌드한다.
 *  * 스크립트를 고친 뒤에는 배포 > 배포 관리 > 연필 > 버전 "새 버전" 으로 다시 배포해야 반영된다.
 *
 * 카카오톡 알림 (선택, README "카카오톡 알림 설정" 참고):
 *  - 카카오 "나에게 보내기" API 로 운영자 본인 카카오톡에 알림을 보낸다.
 *  - 설정값은 코드가 아니라 스크립트 속성(프로젝트 설정 > 스크립트 속성)에 둔다.
 *      KAKAO_REST_KEY        : 카카오 앱의 REST API 키 (직접 입력)
 *      KAKAO_CLIENT_SECRET   : (선택) 콘솔에서 Client Secret 을 "사용함"으로 켠 경우에만 입력
 *      KAKAO_REFRESH_TOKEN   : kakaoExchangeCode 가 저장 (직접 만질 일 없음)
 *      KAKAO_ACCESS_TOKEN    : 코드가 자동 발급/갱신해 저장
 *      KAKAO_ACCESS_EXPIRES  : 액세스 토큰 만료시각(ms) - 코드가 저장
 *  - 최초 1회: kakaoAuthUrl 실행 -> 로그의 URL 을 브라우저에서 열어 동의 -> 주소창 code= 값을
 *    아래 KAKAO_AUTH_CODE 에 붙여 넣고 kakaoExchangeCode 실행 -> kakaoTest 로 확인.
 *  - 카카오 설정이 없거나 전송에 실패해도 접수와 이메일 알림은 그대로 동작한다.
 */

var NOTIFY_EMAIL = "zzorro0382@gmail.com";   // 신청이 들어오면 이 주소로 메일 알림 (비우면 메일 알림 없음)
var SHEET_NAME   = "상담신청";                // 이 이름의 시트가 없으면 자동으로 만든다

// ---- 카카오톡 설정 ---------------------------------------------------------
var KAKAO_REDIRECT_URI = "https://localhost";   // 카카오 개발자 콘솔 > 카카오 로그인 > Redirect URI 에 똑같이 등록할 값
var KAKAO_AUTH_CODE    = "";                    // 최초 인증 때만 사용: 브라우저 주소창의 code= 값을 여기 붙여 넣고 kakaoExchangeCode 실행
var KAKAO_TEXT_MAX     = 200;                   // 카카오 텍스트 템플릿의 본문 최대 길이
var KAKAO_PROP = {                              // 스크립트 속성 키 이름
  restKey:       "KAKAO_REST_KEY",
  clientSecret:  "KAKAO_CLIENT_SECRET",
  refreshToken:  "KAKAO_REFRESH_TOKEN",
  accessToken:   "KAKAO_ACCESS_TOKEN",
  accessExpires: "KAKAO_ACCESS_EXPIRES"
};

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
  ["처리상태",        "_status"],   // 담당자가 시트에서 직접 적는 칸 (예: 연락완료 / 상담예약 / 종료)
  ["통계활용동의(선택)", "statConsent"]   // 2026-10 추가: 이력서·연봉 정보를 익명 통계에 쓰는 데 대한 선택 동의
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

    // 시트에 적힌 뒤의 알림은 실패해도 접수는 성공으로 응답한다 (로그만 남김)
    var sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    try {
      sendEmailNotify_(data, sheetUrl);
    } catch (mailErr) {
      Logger.log("이메일 알림 실패: " + mailErr);
    }
    try {
      kakaoNotify_(data, sheetUrl);
    } catch (kakaoErr) {
      Logger.log("카카오톡 알림 실패: " + kakaoErr);
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
  if (sh.getLastColumn() < COLUMNS.length) {   // 열이 늘어난 경우(예: 통계활용동의) 머리글만 이어 붙인다
    for (var i = sh.getLastColumn(); i < COLUMNS.length; i++) sh.getRange(1, i + 1).setValue(COLUMNS[i][0]);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---- 이메일 알림 -----------------------------------------------------------

function sendEmailNotify_(data, sheetUrl) {
  if (!NOTIFY_EMAIL) return false;
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: "[취업조로 상담신청] " + data.name + " · " + (data.type || "") + " · " + (data.job || ""),
    body: COLUMNS.map(function (c) { return c[0] + ": " + (data[c[1]] || ""); }).join("\n") +
          "\n\n시트: " + sheetUrl
  });
  return true;
}

// ---- 카카오톡 "나에게 보내기" 알림 ------------------------------------------

/**
 * 신청 내용을 운영자 본인 카카오톡으로 보낸다.
 * 카카오 설정(REST 키 / refresh token)이 없으면 아무것도 하지 않고 false 를 돌려준다.
 */
function kakaoNotify_(data, sheetUrl) {
  var token = kakaoAccessToken_();
  if (!token) {
    Logger.log("카카오 설정 없음(KAKAO_REST_KEY / KAKAO_REFRESH_TOKEN) - 카카오톡 알림 건너뜀");
    return false;
  }

  var base = kakaoMessageText_(data);
  var text = base + "\n시트 열기 → " + sheetUrl;
  if (text.length > KAKAO_TEXT_MAX) {              // 본문 200자 제한: URL 이 안 들어가면 버튼으로만 안내
    text = base + "\n시트 열기 → 아래 버튼";
  }
  text = truncate_(text, KAKAO_TEXT_MAX);

  var template = {
    object_type: "text",
    text: text,
    link: { web_url: sheetUrl, mobile_web_url: sheetUrl },
    button_title: "시트 열기"
  };

  var res = kakaoSendTemplate_(token, template);
  if (res.code === 401) {                          // 토큰이 서버에서 먼저 만료된 경우: 한 번 갱신하고 재시도
    token = kakaoRefreshAccessToken_();
    res = kakaoSendTemplate_(token, template);
  }
  if (res.code !== 200) {
    // 링크 도메인(docs.google.com)이 카카오 앱의 Web 플랫폼에 등록되지 않으면 실패할 수 있다 -> 링크 없이 한 번 더
    Logger.log("카카오 전송 1차 실패 HTTP " + res.code + ": " + res.body + " - 링크 없이 재시도");
    template = { object_type: "text", text: truncate_(base + "\n시트 열기 → " + sheetUrl, KAKAO_TEXT_MAX), link: {} };
    res = kakaoSendTemplate_(token, template);
  }
  if (res.code !== 200) {
    throw new Error("카카오 전송 실패 HTTP " + res.code + ": " + res.body);
  }
  return true;
}

// 알림 본문: "[상담신청] 홍길동 · 중고신입 · 지원직무 인사 / 연락처 / 고민(80자)"
function kakaoMessageText_(data) {
  var lines = [
    "[상담신청] " + (data.name || "-") + " · " + (data.type || "-") + " · 지원직무 " + (data.job || "-"),
    "연락처 " + (data.phone || "-")
  ];
  var msg = String(data.message || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  if (msg) lines.push("고민: " + truncate_(msg, 80));
  return lines.join("\n");
}

// 메시지 API 호출. { code: HTTP 상태, body: 응답 본문 } 을 돌려준다 (예외는 던지지 않음)
function kakaoSendTemplate_(accessToken, template) {
  var res = UrlFetchApp.fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "post",
    headers: { Authorization: "Bearer " + accessToken },
    payload: { template_object: JSON.stringify(template) },
    muteHttpExceptions: true
  });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

/**
 * 유효한 액세스 토큰을 돌려준다. 저장된 토큰이 만료(1분 여유)됐으면 refresh token 으로 자동 갱신.
 * 카카오 설정이 없으면 "" 를 돌려준다.
 */
function kakaoAccessToken_() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(KAKAO_PROP.restKey) || !props.getProperty(KAKAO_PROP.refreshToken)) return "";
  var access  = props.getProperty(KAKAO_PROP.accessToken);
  var expires = Number(props.getProperty(KAKAO_PROP.accessExpires) || 0);
  if (access && Date.now() < expires - 60 * 1000) return access;
  return kakaoRefreshAccessToken_();
}

// refresh token 으로 액세스 토큰 재발급. 새 refresh token 이 내려오면 함께 저장한다.
function kakaoRefreshAccessToken_() {
  var props = PropertiesService.getScriptProperties();
  var payload = {
    grant_type:    "refresh_token",
    client_id:     props.getProperty(KAKAO_PROP.restKey),
    refresh_token: props.getProperty(KAKAO_PROP.refreshToken)
  };
  var secret = props.getProperty(KAKAO_PROP.clientSecret);
  if (secret) payload.client_secret = secret;
  var body = kakaoTokenRequest_(payload);
  kakaoSaveTokens_(body);
  return body.access_token;
}

// https://kauth.kakao.com/oauth/token 호출 공통부. 실패하면 응답 내용을 담아 예외를 던진다.
function kakaoTokenRequest_(payload) {
  var res = UrlFetchApp.fetch("https://kauth.kakao.com/oauth/token", {
    method: "post",
    payload: payload,
    muteHttpExceptions: true
  });
  var text = res.getContentText();
  var body = {};
  try { body = JSON.parse(text); } catch (ignore) {}
  if (res.getResponseCode() !== 200 || !body.access_token) {
    throw new Error("카카오 토큰 요청 실패(" + payload.grant_type + ") HTTP " + res.getResponseCode() + ": " + text);
  }
  return body;
}

// 토큰 응답을 스크립트 속성에 저장
function kakaoSaveTokens_(body) {
  var upd = {};
  upd[KAKAO_PROP.accessToken]   = body.access_token;
  upd[KAKAO_PROP.accessExpires] = String(Date.now() + (Number(body.expires_in) || 21600) * 1000);
  if (body.refresh_token) upd[KAKAO_PROP.refreshToken] = body.refresh_token;   // 만료 1달 전부터 새 토큰이 내려온다
  PropertiesService.getScriptProperties().setProperties(upd);
}

function truncate_(s, n) {
  s = String(s == null ? "" : s);
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ---- 카카오 최초 인증용 함수 (편집기에서 함수 선택 → ▶ 실행) ----------------------

/**
 * 1단계. 브라우저에서 열 인가 URL 을 로그(실행 로그)에 출력한다.
 * 먼저 스크립트 속성에 KAKAO_REST_KEY 를 저장해 두어야 한다.
 */
function kakaoAuthUrl() {
  var restKey = PropertiesService.getScriptProperties().getProperty(KAKAO_PROP.restKey);
  if (!restKey) {
    Logger.log("먼저 프로젝트 설정 > 스크립트 속성에 KAKAO_REST_KEY (카카오 앱의 REST API 키) 를 저장하세요.");
    return "";
  }
  var url = "https://kauth.kakao.com/oauth/authorize"
    + "?response_type=code"
    + "&client_id=" + encodeURIComponent(restKey)
    + "&redirect_uri=" + encodeURIComponent(KAKAO_REDIRECT_URI)
    + "&scope=talk_message";
  Logger.log("아래 URL 을 브라우저에 붙여 넣어 열고, 카카오 로그인 후 [동의하고 계속하기]를 누르세요.\n" + url
    + "\n\n동의하면 주소창이 " + KAKAO_REDIRECT_URI + "/?code=XXXX 로 바뀝니다 (페이지는 '연결할 수 없음'이어도 정상)."
    + "\ncode= 뒤의 값을 복사해 이 파일의 KAKAO_AUTH_CODE 에 붙여 넣고 kakaoExchangeCode 를 실행하세요.");
  return url;
}

/**
 * 2단계. 인가 코드 -> 토큰 교환 후 스크립트 속성에 저장한다.
 * 편집기에서 실행할 때는 인수를 못 넘기므로, 위의 KAKAO_AUTH_CODE 에 코드를 붙여 넣고 실행한다.
 * (인가 코드는 1회용이고 몇 분 안에 만료되므로, 실패하면 kakaoAuthUrl 부터 다시)
 */
function kakaoExchangeCode(code) {
  var props = PropertiesService.getScriptProperties();
  code = (typeof code === "string" && code) ? code : KAKAO_AUTH_CODE;
  code = String(code || "").replace(/^\s+|\s+$/g, "");
  if (!code) {
    Logger.log("인가 코드가 없습니다. kakaoAuthUrl 을 실행해 받은 code= 값을 KAKAO_AUTH_CODE 에 붙여 넣고 다시 실행하세요.");
    return false;
  }
  var restKey = props.getProperty(KAKAO_PROP.restKey);
  if (!restKey) {
    Logger.log("스크립트 속성에 KAKAO_REST_KEY 가 없습니다.");
    return false;
  }
  var payload = {
    grant_type:   "authorization_code",
    client_id:    restKey,
    redirect_uri: KAKAO_REDIRECT_URI,
    code:         code
  };
  var secret = props.getProperty(KAKAO_PROP.clientSecret);
  if (secret) payload.client_secret = secret;

  var body = kakaoTokenRequest_(payload);
  if (!body.refresh_token) {
    throw new Error("응답에 refresh_token 이 없습니다: " + JSON.stringify(body));
  }
  kakaoSaveTokens_(body);
  var scope = String(body.scope || "");
  Logger.log("카카오 토큰 저장 완료. scope=" + scope
    + (scope.indexOf("talk_message") < 0 ? "\n주의: talk_message 동의가 빠져 있습니다. 동의항목 설정을 확인하고 다시 인증하세요." : "")
    + "\n이제 KAKAO_AUTH_CODE 는 비워도 됩니다. kakaoTest 를 실행해 카카오톡으로 메시지가 오는지 확인하세요.");
  return true;
}

/**
 * 3단계. 테스트 메시지를 내 카카오톡으로 보낸다.
 */
function kakaoTest() {
  var sample = {
    name: "테스트", type: "중고신입", job: "인사", phone: "010-0000-0000",
    message: "카카오톡 알림 테스트입니다. 이 메시지가 보이면 설정이 끝난 것입니다."
  };
  var sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var ok = kakaoNotify_(sample, sheetUrl);
  Logger.log(ok ? "카카오톡 전송 성공 - 내 카카오톡(나와의 채팅)을 확인하세요."
                : "카카오 설정이 없어 보내지 않았습니다. README 의 카카오톡 알림 설정 절차를 확인하세요.");
  return ok;
}

/**
 * (선택) refresh token 유효기간(약 2개월) 유지용.
 * 신청이 두 달 넘게 없으면 토큰이 만료될 수 있으니, 트리거(시계 아이콘) > 시간 기반 > 주 단위로 이 함수를 걸어 두면
 * 주기적으로 갱신돼 만료를 막는다.
 */
function kakaoKeepAlive() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(KAKAO_PROP.restKey) || !props.getProperty(KAKAO_PROP.refreshToken)) {
    Logger.log("카카오 설정 없음 - 건너뜀");
    return false;
  }
  kakaoRefreshAccessToken_();
  Logger.log("카카오 토큰 갱신 완료");
  return true;
}

// 편집기에서 ▶ 실행해 보면 시트에 테스트 행이 하나 들어간다 (처음 한 번 권한 승인 창이 뜬다)
function testInsert() {
  var fake = { postData: { contents: JSON.stringify({ type: "신입", name: "테스트", phone: "010-0000-0000", reason: "테스트 접수", status: "신입", job: "서비스 기획", region: "서울", message: "테스트", consent: "동의", page: "test" }) } };
  Logger.log(doPost(fake).getContent());
}
