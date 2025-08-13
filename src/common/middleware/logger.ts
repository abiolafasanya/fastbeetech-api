// import winston from "winston";

// const myCustomLevels = {
//   levels: {
//     error: 0,
//     warn: 1,
//     info: 2,
//     success: 3,
//     debug: 4,
//     silly: 5,
//   },
//   colors: {
//     error: "red",
//     warn: "yellow", // fixed from "orange"
//     info: "blue",
//     success: "green",
//     debug: "cyan",
//     silly: "magenta",
//   },
// };

// winston.addColors(myCustomLevels.colors);

// export const logger = winston.createLogger({
//   levels: myCustomLevels.levels,
//   level: process.env.LOG_LEVEL || "success",
//   format: winston.format.combine(
//     winston.format.colorize({ all: true }),
//     winston.format.timestamp(),
//     winston.format.printf(({ timestamp, level, message }) => {
//       return `[${timestamp}] ${level}: ${message}`;
//     })
//   ),
//   defaultMeta: { service: "fastbeet-api" },
//   transports: [new winston.transports.Console()],
// });

// export default logger;


import winston from "winston";

const myCustomLevels = {
  levels: { error: 0, warn: 1, info: 2, success: 3, debug: 4, silly: 5 },
  colors: {
    error: "red",
    warn: "yellow",
    info: "blue",
    success: "green",
    debug: "cyan",
    silly: "magenta",
  },
};
winston.addColors(myCustomLevels.colors);

export const logger = winston.createLogger({
  levels: myCustomLevels.levels,
  level: process.env.LOG_LEVEL || "success",
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp(),
    winston.format.printf((info) => {
      const { timestamp, level, message, ...meta } = info;
      const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
      return `[${timestamp}] ${level}: ${message}${extra}`;
    })
  ),

  // format: winston.format.combine(
  //   winston.format.splat(),
  //   winston.format.colorize({ all: true }),
  //   winston.format.timestamp(),
  //   winston.format.printf((info) => {
  //     const { timestamp, level, message, ...meta } = info;
  //     const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  //     return `[${timestamp}] ${level}: ${message}${extra}`;
  //   })
  // ),
  defaultMeta: { service: "api" },
  transports: [new winston.transports.Console()],
});

export default logger;
