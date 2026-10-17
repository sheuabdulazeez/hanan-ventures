// Tailwind v4 positions elements with the individual `translate`, `scale` and
// `rotate` CSS properties, which only exist in Chromium 104+. Older WebView2
// runtimes on Windows ignore them, so e.g. dialogs centred with
// `translate-x-[-50%] translate-y-[-50%]` end up in the bottom-right corner.
// For every rule using those properties, emit an equivalent `transform` that
// only applies when the browser lacks `translate` support.

const PROPS = new Set(["translate", "scale", "rotate"]);

const COMPOSITE =
  "translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0)) " +
  "rotate(var(--tw-rotate-fb, 0deg)) " +
  "scale(var(--tw-scale-fb-x, 1), var(--tw-scale-fb-y, 1))";

// Old engines don't accept percentages inside scale(), so convert "110%" to 1.1.
function toScaleNumber(value) {
  const v = value.trim();
  if (/^-?\d*\.?\d+$/.test(v)) return v;
  const pct = v.match(/^(-?\d*\.?\d+)%$/);
  if (pct) return String(parseFloat(pct[1]) / 100);
  const neg = v.match(/^calc\((-?\d*\.?\d+)%\s*\*\s*-1\)$/);
  if (neg) return String(-parseFloat(neg[1]) / 100);
  return null;
}

function insideKeyframes(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === "atrule" && /keyframes$/i.test(p.name)) return true;
  }
  return false;
}

export default function transformFallback() {
  return {
    postcssPlugin: "transform-fallback",
    OnceExit(root, { AtRule, Rule, Declaration }) {
      const rules = new Set();
      root.walkDecls((decl) => {
        if (PROPS.has(decl.prop) && decl.parent?.type === "rule" && !insideKeyframes(decl)) {
          rules.add(decl.parent);
        }
      });
      if (rules.size === 0) return;

      for (const rule of rules) {
        const fallback = new Rule({ selector: rule.selector });
        rule.each((decl) => {
          if (decl.type !== "decl") return;
          if (decl.prop === "rotate") {
            fallback.append(
              new Declaration({ prop: "--tw-rotate-fb", value: decl.value === "none" ? "0deg" : decl.value }),
            );
          } else if (decl.prop === "--tw-scale-x" || decl.prop === "--tw-scale-y") {
            const n = toScaleNumber(decl.value);
            if (n !== null) {
              fallback.append(new Declaration({ prop: decl.prop.replace("--tw-scale", "--tw-scale-fb"), value: n }));
            }
          }
        });
        fallback.append(new Declaration({ prop: "transform", value: COMPOSITE }));

        const supports = new AtRule({ name: "supports", params: "not (translate: 0)" });
        supports.append(fallback);
        rule.after(supports);
      }

      // Keep the helper variables from leaking into child elements.
      for (const name of ["--tw-rotate-fb", "--tw-scale-fb-x", "--tw-scale-fb-y"]) {
        const prop = new AtRule({ name: "property", params: name });
        prop.append(new Declaration({ prop: "syntax", value: '"*"' }));
        prop.append(new Declaration({ prop: "inherits", value: "false" }));
        root.append(prop);
      }
    },
  };
}
transformFallback.postcss = true;
