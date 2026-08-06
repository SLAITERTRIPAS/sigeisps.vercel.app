const fs = require("fs");
let code = fs.readFileSync(
  "src/blocos/bloco5_sistema/PlanoWorkflowView.tsx",
  "utf8",
);

// Replace instances of Visualizar button closure with the delete button right after it.
// Case 1: activity
code = code.replace(
  /<Eye size=\{13\} \/>\s*<\/button>\s*<\/div>/g,
  (match, offset, string) => {
    // Determine indentation
    const lines = match.split("\n");
    const indent = lines[lines.length - 1].replace("</div>", "");

    // Check if the surrounding context uses `act` or `activity`
    const isAct = string
      .substring(offset - 300, offset)
      .includes("setEditingActivity(act)");
    const varName = isAct ? "act" : "activity";

    return `<Eye size={13} />
${indent}  </button>
${indent}  <button
${indent}    onClick={() => handleDelete(${varName}.id)}
${indent}    className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded"
${indent}    title="Remover"
${indent}  >
${indent}    <Trash2 size={13} />
${indent}  </button>
${indent}</div>`;
  },
);

// Remove the `isChefeDPEP` restriction for the delete button around line 4194
code = code.replace(
  /\{isChefeDPEP && \(\s*(<button\s*onClick=\{\(\) => handleDelete\(activity\.id\)\}[\s\S]*?<\/button>)\s*\)\}/g,
  "$1",
);

fs.writeFileSync("src/blocos/bloco5_sistema/PlanoWorkflowView.tsx", code);
