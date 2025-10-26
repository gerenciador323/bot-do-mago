const originalLog = console.log;
const originalError = console.error;

const ignorePatterns = [
  "Bad MAC Error",
  "Decrypted message with closed session",
  "Closing stale open session",
  "SessionEntry",
];

function filterConsole() {
  console.log = (...args) => {
    if (
      !args.some((arg) =>
        ignorePatterns.some((p) => arg.toString().includes(p))
      )
    ) {
      originalLog(...args);
    }
  };

  console.error = (...args) => {
    if (
      !args.some((arg) =>
        ignorePatterns.some((p) => arg.toString().includes(p))
      )
    ) {
      originalError(...args);
    }
  };
}

module.exports = filterConsole;
