import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";

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

const PrintPreviewPage = () => {
  const { file, fileName, colorMode, sides, pages, copies, price } = useQueryParams();
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    if (!file) return;

    const ext = fileName?.split(".").pop().toLowerCase();
    if (ext === "png" || ext === "jpg" || ext === "jpeg") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = file;

      img.onload = () => {
        const pdf = new jsPDF({
          orientation: img.width > img.height ? "l" : "p",
          unit: "px",
          format: [img.width, img.height],
        });
        pdf.addImage(img, "PNG", 0, 0, img.width, img.height);
        const pdfBlob = pdf.output("blob");
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setPreviewFile(pdfUrl);
      };
    } else {
      setPreviewFile(file);
    }
  }, [file, fileName]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel */}
      <div className="w-80 bg-gradient-to-b from-blue-500 to-blue-700 text-white p-8 flex flex-col justify-between shadow-lg">
        <div>
          <h2 className="text-3xl font-bold mb-6 border-b border-blue-300 pb-2">
            Recipe
          </h2>
          <div className="space-y-3 text-lg">
            <p>
              <span className="font-semibold">Mode: </span>
              {colorMode || "B/w"}
            </p>
            <p>
              <span className="font-semibold">Sides: </span>
              {sides || "Single side"}
            </p>
            <p>
              <span className="font-semibold">Pages: </span>
              {pages || "All"}
            </p>
            <p>
              <span className="font-semibold">Copies: </span>
              {copies || "1"}
            </p>
            {price && (
              <p>
                <span className="font-semibold">Price: </span>₹{price}
              </p>
            )}
            {fileName && (
              <p>
                <span className="font-semibold">File: </span>
                {fileName}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="mt-6 px-5 py-3 bg-white text-blue-600 font-semibold rounded-xl shadow hover:bg-blue-50 transition"
        >
          Print Document
        </button>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        {previewFile ? (
          <iframe
            src={previewFile}
            title="Document"
            className="w-[85%] h-[90%] rounded-xl border shadow-lg bg-white"
          />
        ) : (
          <div className="text-gray-500 text-2xl">Loading preview...</div>
        )}
      </div>
    </div>
  );
};

export default PrintPreviewPage;
