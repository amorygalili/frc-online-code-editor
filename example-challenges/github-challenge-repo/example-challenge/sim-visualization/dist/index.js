import { jsxs as i, jsx as e } from "react/jsx-runtime";
function a() {
  return window.frcChallengeApi.useNTKeys();
}
function r() {
  const n = a();
  return /* @__PURE__ */ i("div", { style: {
    padding: "20px",
    textAlign: "center",
    borderRadius: "8px",
    margin: "10px"
  }, children: [
    /* @__PURE__ */ e("h2", { children: "Hello!" }),
    /* @__PURE__ */ e("p", { children: "Challenge visualization will be displayed here." }),
    /* @__PURE__ */ e("p", { children: "You can access NetworkTables data and HAL simulation data to create interactive visualizations." }),
    /* @__PURE__ */ i("p", { children: [
      "Available NT Keys: ",
      JSON.stringify(n)
    ] }),
    /* @__PURE__ */ e("div", { style: {
      marginTop: "20px",
      padding: "10px",
      borderRadius: "4px",
      border: "1px solid #ddd"
    }, children: /* @__PURE__ */ e("p", { children: "Replace this placeholder with your challenge-specific visualization components." }) })
  ] });
}
export {
  r as default
};
