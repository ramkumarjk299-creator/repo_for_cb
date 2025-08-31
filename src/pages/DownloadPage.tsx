import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function useQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    file: params.get("file"),
    fileName: params.get("fileName"),
    colorMode: params.get("colorMode"),
    sides: params.get("sides"),
    pages: params.get("pages"),
    copies: params.get("copies"),
    price: params.get("price"),
  };
}

const DownloadPage = () => {
  const { file, fileName, colorMode, sides, pages, copies, price } = useQueryParams();

  useEffect(() => {
    // Auto-trigger print dialog on load
    window.print();
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc" }}>
      {/* Recipe/Order Details - Left Side */}
      <div style={{ width: 320, background: "#fff", boxShadow: "2px 0 8px rgba(0,0,0,0.04)", padding: 32, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Recipe</h2>
        <div style={{ fontSize: 18, marginBottom: 12 }}><b>File Name:</b> {fileName}</div>
        <div style={{ fontSize: 18, marginBottom: 12 }}><b>Color Mode:</b> {colorMode === "bw" ? "Black & White" : "Color"}</div>
        <div style={{ fontSize: 18, marginBottom: 12 }}><b>Sides:</b> {sides === "single" ? "Single Side" : "Double Side"}</div>
        <div style={{ fontSize: 18, marginBottom: 12 }}><b>Pages:</b> {pages}</div>
        <div style={{ fontSize: 18, marginBottom: 12 }}><b>Copies:</b> {copies}</div>
        <div style={{ fontSize: 18, marginBottom: 12 }}><b>Price:</b> ₹{price ? (parseInt(price, 10) / 100).toFixed(2) : "-"}</div>
      </div>
      {/* Document Preview - Right Side */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        {file ? (
          <iframe src={file} title="Document" width="80%" height="90%" style={{ border: "1px solid #ccc", background: "#fff" }} />
        ) : (
          <div style={{ color: "#888", fontSize: 24 }}>No document found.</div>
        )}
      </div>
    </div>
  );
};

export default DownloadPage;
