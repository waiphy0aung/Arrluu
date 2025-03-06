const generateLog: GenerateLog = (status, message, data, detail, errorCode) => {
  const detailText =
    detail instanceof Error
      ? detail.message
      : typeof detail === "string"
      ? detail
      : JSON.stringify(detail, null, 2);

  const errDetail = detail instanceof Error ? detail.message : detail;

  if (status === "success") {
    console.log(`\x1b[32m✔ ${message}\x1b[0m`);
    return { status, message, data };
  } else {
    console.log(
      `\x1b[31mX ${message}\x1b[0m\n\x1b[36m! ${detailText}\x1b[0m\n\x1b[34m`
    );
    return { status, message, detail: errDetail, errorCode };
  }
};

const logger: Logger = {
  success(message, data = null) {
    return generateLog("success", message, data);
  },
  error(message, detail, errorCode) {
    return generateLog("error", message, null, detail, errorCode);
  },
};

export default logger;

type ResponseData = {
  status: "success" | "error" | "fail";
  message: string;
  detail?: string | { [x: string]: any };
  data?: any;
  errorCode?: number;
};

type GenerateLog = (
  status: ResponseData["status"],
  message: ResponseData["message"],
  data?: any,
  detail?: ResponseData["detail"],
  errorCode?: ResponseData["errorCode"]
) => ResponseData;
type SuccessLogger = (message: string, data?: any) => ResponseData;
type ErrorLogger = (
  message: string,
  detail?: ResponseData["detail"],
  errorCode?: ResponseData["errorCode"]
) => ResponseData;
type Logger = { success: SuccessLogger; error: ErrorLogger };
