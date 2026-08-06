const fs = require("fs");
let code = fs.readFileSync(
  "src/blocos/bloco5_sistema/PlanoWorkflowView.tsx",
  "utf8",
);

// Replacements for activity.id
code = code.replace(
  /(\s*)<Eye size=\{13\} \/>\s*<\/button>\s*<\/div>/g,
  (match, p1) => {
    // Check surrounding context, if we have "act.id" we should use act.id, otherwise activity.id
    // But since regex matching is simple, let's just do a string replacement that adjusts for it.
    return match;
  },
);
