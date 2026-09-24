import React, { useState, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import digifoxlogo from "../assets/images/digifox_logo.webp";
import Papa from "papaparse";
import {
  Download,
  Upload,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Users,
  ImagePlus,
} from "lucide-react";
import { Login } from "./components/Login";
import { AdminDashboard } from "./components/AdminDashboard";
import { Employee, Region } from "./types";
import { jsPDF } from "jspdf";
import cavinKareLogo from "../assets/images/CavinKare-logo-z3dMoof1.png";
import defaultBgImage from "../assets/images/id-card-bg-1.png";

const DEFAULT_REGIONS: Region[] = [
  {
    id: "assam",
    name: "Assam",
    address:
      "INDUSTRIES GROWTH CENTRE, MATIA (MORNAI)\nOPPOSITE TO SAINIK SCHOOL, GOALPARA, ASSAM - 783 101.",
    phone: "",
  },
  {
    id: "bhiwandi",
    name: "Bhiwandi Plant",
    address:
      "S.NO. 31/B / 32 A, DHAMANGAON OLD AGRA ROAD,\nTAL. - BHIWANDI, DISTT. - THANE, MUMBAI, MAHARASHTRA - 421 302.",
    phone: "",
  },
  {
    id: "erode",
    name: "Erode",
    address:
      "SF NO. 532, BHAVANI TO ANTHIYUR MAIN ROAD, MYLAMPADI,\nKANNADIPALAYAM POST, BHAVANI TK, ERODE DT - 638 314.",
    phone: "04256 - 238 202 / 302 / 402",
  },
  {
    id: "haridwar",
    name: "Haridwar",
    address:
      "PLOT NO.16 & 17,SECTOR-4, INTEGRATED INDUSTRIAL ESTATE,\nSIDCUL,RANIPUR, HARIDWAR-249403",
    phone: "01334-239246",
  },
  {
    id: "kanchipuram",
    name: "Kanchipuram",
    address: "NO. 18, ARYAPERUMBAKKAM VILLAGE, KANCHIPURAM - 631 502.",
    phone: "2729 4580/81",
  },
  {
    id: "pondy",
    name: "Pondy",
    address:
      "R.S. NO. 81/4, KORKADU VILLAGE, NETTAPAKKAM COMMUNE,\nPONDICHERRY -605 110.",
    phone: "0413 - 2665146",
  },
  {
    id: "ro-east",
    name: "RO East",
    address:
      "14TH FLOOR, P.S. SRIJAN TECH PARK, DN - 52, DN BLOCK, SECTOR - 5,\nSALT LAKE CITY, KOLKATA - 700091",
    phone: "033 - 40669540",
  },
  {
    id: "ro-north",
    name: "RO North",
    address: "D-12/ 2ND FLOOR, KAUSHAMBI, GHAZIABAD - 201010\nUTTAR PRADESH",
    phone: "0120-4335396",
  },
  {
    id: "ro-south",
    name: "RO South",
    address: "NO. 12, POONAMALLEE ROAD, EKKATTUTHANGAL,\nCHENNAI - 6OO 032.",
    phone: "044 - 2225 1011 / 12",
  },
  {
    id: "ro-west",
    name: "RO West",
    address:
      "504-A, RAHEJA PLAZA PREMISES CO-OP SOCIETY LTD.,\nL.B.S. MARG, GHATKOPAR (WEST), MUMBAI – 400086",
    phone: "",
  },
];

export default function App() {
  const [role, setRole] = useState<"login" | "user" | "admin">(() => {
    const savedRole = localStorage.getItem("userRole");
    return (savedRole as "login" | "user" | "admin") || "login";
  });

  useEffect(() => {
    localStorage.setItem("userRole", role);
  }, [role]);

  const [regions, setRegions] = useState<Region[]>(DEFAULT_REGIONS);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee>({
    id: crypto.randomUUID(),
    name: "NAGAMUTHU A",
    employeeId: "1016434",
    unitId: "erode",
    doj: "09/03/2026",
    dob: "06/12/1999",
    bloodGroup: "AB+",
    emergencyNo: "9791238462",
    photoUrl: null,
  });

  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Fetch regions from server
    fetch("/api/regions")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) setRegions(data);
      })
      .catch((err) => console.error("Error fetching regions:", err));

    // 2. Fetch global background setting
    const localBg = localStorage.getItem("savedBgImage");
    if (localBg) {
      setBgImage(localBg);
    } else {
      fetch("/api/settings/globalBgImage")
        .then((res) => res.json())
        .then((data) => {
          if (data.value) setBgImage(data.value);
        })
        .catch((err) => console.error("Error fetching global bg setting:", err));
    }
  }, []);

  const currentRegion =
    regions.find((r) => r.id === currentEmployee.unitId) || regions[0];

  const logCreation = async (unitId: string, count: number) => {
    try {
      await fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, count }),
      });
    } catch (err) {
      console.error("Error logging card creation stats:", err);
    }
  };

  const handleInputChange = (field: keyof Employee, value: any) => {
    setCurrentEmployee((prev) => ({ ...prev, [field]: value }));
    if (isBatchMode) {
      setEmployees((emps) =>
        emps.map((e) =>
          e.id === currentEmployee.id ? { ...e, [field]: value } : e,
        ),
      );
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        handleInputChange("photoUrl", event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setBgImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (employees.length === 0) {
        alert("Please import CSV first before uploading photos.");
        return;
      }

      const files = Array.from(e.target.files) as File[];

      const updatedEmployees = [...employees];
      let matchedCount = 0;

      files.forEach((file) => {
        const lastDot = file.name.lastIndexOf(".");
        const fileNameWithoutExt = (
          lastDot !== -1 ? file.name.substring(0, lastDot) : file.name
        ).trim();
        const normalizedFileName = fileNameWithoutExt
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        const employeeIndex = updatedEmployees.findIndex((emp) => {
          const empId = String(emp.employeeId || "").trim();
          const empIdNormalized = empId.toLowerCase().replace(/[^a-z0-9]/g, "");
          const empNameNormalized = String(emp.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

          return (
            (empId !== "" && empId === fileNameWithoutExt) ||
            (empIdNormalized !== "" &&
              empIdNormalized === normalizedFileName) ||
            (empNameNormalized !== "" &&
              empNameNormalized === normalizedFileName)
          );
        });

        if (employeeIndex >= 0) {
          updatedEmployees[employeeIndex].photoUrl = URL.createObjectURL(file);
          matchedCount++;
        }
      });

      setEmployees(updatedEmployees);
      // update current employee if matched
      const currIdx = updatedEmployees.findIndex(
        (e) => e.id === currentEmployee.id,
      );
      if (currIdx >= 0) setCurrentEmployee(updatedEmployees[currIdx]);

      alert(`Successfully matched ${matchedCount} photos to employees!`);
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      Papa.parse(e.target.files[0], {
        header: true,
        complete: (results) => {
          const newEmployees = results.data
            .map((row: any) => {
              const csvUnit = String(row.unitId || row.unit || row.region || "")
                .trim()
                .toLowerCase();
              let matchedUnit = regions.find(
                (r) =>
                  r.id.toLowerCase() === csvUnit ||
                  r.name.toLowerCase() === csvUnit,
              );

              if (!matchedUnit && csvUnit) {
                matchedUnit = regions.find(
                  (r) =>
                    r.name.toLowerCase().includes(csvUnit) ||
                    csvUnit.includes(r.name.toLowerCase()),
                );
              }

              const finalUnitId = matchedUnit
                ? matchedUnit.id
                : regions[0]?.id || "erode";

              return {
                id: crypto.randomUUID(),
                name: String(row.name || "").trim(),
                employeeId: String(row.employeeId || "").trim(),
                unitId: finalUnitId,
                doj: String(row.doj || "").trim(),
                dob: String(row.dob || "").trim(),
                bloodGroup: String(row.bloodGroup || "").trim(),
                emergencyNo: String(row.emergencyNo || "").trim(),
                photoUrl: null,
              };
            })
            .filter((e) => e.name);

          if (newEmployees.length > 0) {
            setEmployees(newEmployees);
            setCurrentEmployee(newEmployees[0]);
            setIsBatchMode(true);
          }
        },
      });
    }
  };

  const handleSave = () => {
    localStorage.setItem(
      "savedEmployeeDetails",
      JSON.stringify(currentEmployee),
    );
    if (bgImage) {
      localStorage.setItem("savedBgImage", bgImage);
    }
    if (isBatchMode) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === currentEmployee.id ? currentEmployee : e)),
      );
    }
    alert("Details saved successfully!");
  };

  const handleDownloadSampleCSV = () => {
    const csvContent =
      "name,employeeId,unit,doj,dob,bloodGroup,emergencyNo\nJohn Doe,101234,Erode,01/01/2023,15/08/1990,O+,9876543210\nJane Smith,101235,Chennai,15/06/2022,22/11/1992,A-,8765432109";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "sample_employees.csv");
  };

  const handleDownloadSingleBoth = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      
      // 1. Download PNG Image
      const link = document.createElement("a");
      link.download = `${currentEmployee.name || "ID"}_${currentRegion.name}.png`;
      link.href = dataUrl;
      link.click();

      // 2. Download PDF Document (Standard portrait card format 54mm x 85.6mm)
      setTimeout(() => {
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [54, 85.6],
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, 54, 85.6);
        pdf.save(`${currentEmployee.name || "ID"}_${currentRegion.name}.pdf`);
      }, 300);

      logCreation(currentEmployee.unitId, 1);
    } catch (err) {
      console.error("Error generating card:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateBulkZip = async (format: "png" | "pdf" | "both" = "both") => {
    if (employees.length === 0 || !cardRef.current) return;
    setIsGenerating(true);

    try {
      const zip = new JSZip();
      const folderPNG = (format === "png" || format === "both") ? zip.folder("PNG_Cards") : null;
      const folderPDF = (format === "pdf" || format === "both") ? zip.folder("PDF_Cards") : null;

      const originalEmployee = currentEmployee;

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        setCurrentEmployee(emp);
        await new Promise((resolve) => setTimeout(resolve, 150));

        const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
        const base64Data = dataUrl.split(",")[1];
        const region = regions.find((r) => r.id === emp.unitId) || regions[0];
        const fileNameBase = `${emp.name || "ID"}_${region.name}`;

        if (folderPNG) {
          folderPNG.file(`${fileNameBase}.png`, base64Data, { base64: true });
        }

        if (folderPDF) {
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: [54, 85.6],
          });
          pdf.addImage(dataUrl, "PNG", 0, 0, 54, 85.6);
          const pdfArrayBuffer = pdf.output("arraybuffer");
          folderPDF.file(`${fileNameBase}.pdf`, pdfArrayBuffer);
        }
      }

      setCurrentEmployee(originalEmployee);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Bulk_ID_Cards_${format.toUpperCase()}.zip`);

      const counts: Record<string, number> = {};
      employees.forEach((emp) => {
        counts[emp.unitId] = (counts[emp.unitId] || 0) + 1;
      });
      Object.entries(counts).forEach(([unitId, count]) => {
        logCreation(unitId, count);
      });
    } catch (err) {
      console.error("Error generating ZIP:", err);
      alert("Failed to generate ZIP file.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (role === "login") {
    return <Login onLogin={setRole} />;
  }

  if (role === "admin") {
    return (
      <AdminDashboard
        onLogout={() => setRole("login")}
        regions={regions}
        setRegions={setRegions}
      />
    );
  }

  return (
    <div className="w-full min-h-screen lg:h-screen bg-slate-50 flex flex-col text-slate-800 font-sans lg:overflow-hidden">
      {/* Header Section */}
      <header className="h-auto min-h-16 bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-0 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center">
            <img
              src={cavinKareLogo}
              alt="CavinKare Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <span className="font-bold text-xl tracking-tight text-black">
            ID CARD <span className="text-blue-600">Maker</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div
            className={`flex items-center gap-2 text-sm font-medium ${true ? "text-blue-700" : "text-slate-500"}`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${true ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-600"}`}
            >
              1
            </span>{" "}
            Entry
          </div>
          <div className="w-8 h-px bg-slate-300"></div>
          <div
            className={`flex items-center gap-2 text-sm font-medium ${currentEmployee.photoUrl ? "text-blue-700" : "text-slate-400"}`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentEmployee.photoUrl ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-600"}`}
            >
              2
            </span>{" "}
            Photo
          </div>
          <div className="w-8 h-px bg-slate-300"></div>
          <div
            className={`flex items-center gap-2 text-sm font-medium ${currentEmployee.name ? "text-slate-900" : "text-slate-400"}`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentEmployee.name ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"}`}
            >
              3
            </span>{" "}
            Export
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <HelpCircle className="w-4 h-4" /> <span className="hidden sm:inline">Help & Support</span>
          </button>
          <button
            onClick={() => setRole("login")}
            className="text-sm font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {/* Sidebar Configuration */}
        <aside className="w-full lg:w-[380px] bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col p-6 lg:p-8 shrink-0 overflow-y-visible lg:overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-1 text-slate-900">
              Personnel Information
            </h2>
            <p className="text-sm text-slate-500">
              Fill out the details for the credential.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Background Template
                </label>
                {bgImage && (
                  <button
                    onClick={() => setBgImage(null)}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider"
                  >
                    Clear Image
                  </button>
                )}
              </div>
              <label className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors relative overflow-hidden h-32">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBgUpload}
                />
                {bgImage ? (
                  <div className="absolute inset-0 p-2">
                    <img
                      src={bgImage}
                      alt="Background Preview"
                      className="w-full h-full object-cover rounded shadow-sm opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center flex-col z-10 text-slate-800 drop-shadow-md font-bold">
                      <ImagePlus className="w-8 h-8 mb-2" />
                      <span className="text-xs uppercase tracking-widest">
                        Replace Template
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-medium text-slate-600">
                      Click to upload background template
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      PNG, JPG up to 5MB
                    </span>
                  </>
                )}
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Unit / Region
              </label>
              <select
                value={currentEmployee.unitId}
                onChange={(e) => handleInputChange("unitId", e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={currentEmployee.name}
                onChange={(e) =>
                  handleInputChange("name", e.target.value.toUpperCase())
                }
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={currentEmployee.employeeId}
                  onChange={(e) =>
                    handleInputChange(
                      "employeeId",
                      e.target.value.toUpperCase(),
                    )
                  }
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Blood Group
                </label>
                <input
                  type="text"
                  value={currentEmployee.bloodGroup}
                  onChange={(e) =>
                    handleInputChange(
                      "bloodGroup",
                      e.target.value.toUpperCase(),
                    )
                  }
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  D.O.J
                </label>
                <input
                  type="text"
                  value={currentEmployee.doj}
                  onChange={(e) => handleInputChange("doj", e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  D.O.B
                </label>
                <input
                  type="text"
                  value={currentEmployee.dob}
                  onChange={(e) => handleInputChange("dob", e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Emergency No
              </label>
              <input
                type="text"
                value={currentEmployee.emergencyNo}
                onChange={(e) =>
                  handleInputChange("emergencyNo", e.target.value)
                }
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Photo Upload
              </label>
              <label className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors relative">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                {currentEmployee.photoUrl ? (
                  <div className="absolute inset-0 p-2">
                    <img
                      src={currentEmployee.photoUrl}
                      alt="Preview"
                      className="w-full h-full object-cover rounded shadow-sm opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center flex-col z-10 text-slate-800 font-bold drop-shadow-md">
                      <ImagePlus className="w-8 h-8 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        Replace Photo
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-medium text-slate-600">
                      Click to upload portrait
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      PNG, JPG up to 5MB
                    </span>
                  </>
                )}
              </label>

              {currentEmployee.photoUrl && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Adjust Photo
                    </span>
                  </div>
                  <div>
                    <label className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Zoom</span>
                      <span>
                        {Math.round((currentEmployee.photoScale || 1) * 100)}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={currentEmployee.photoScale || 1}
                      onChange={(e) =>
                        handleInputChange(
                          "photoScale",
                          parseFloat(e.target.value),
                        )
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>X Offset</span>
                        <span>{currentEmployee.photoOffsetX || 0}px</span>
                      </label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        value={currentEmployee.photoOffsetX || 0}
                        onChange={(e) =>
                          handleInputChange(
                            "photoOffsetX",
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full accent-blue-600"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Y Offset</span>
                        <span>{currentEmployee.photoOffsetY || 0}px</span>
                      </label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        value={currentEmployee.photoOffsetY || 0}
                        onChange={(e) =>
                          handleInputChange(
                            "photoOffsetY",
                            parseInt(e.target.value),
                          )
                        }
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Batch Upload Section */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Batch Import (Optional)
              </label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="flex-1 bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 px-3 py-2 rounded text-sm font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors">
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCSVUpload}
                    />
                    <Upload className="w-4 h-4 shrink-0" /> Import CSV
                  </label>
                  <button
                    onClick={handleDownloadSampleCSV}
                    className="flex-1 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4 shrink-0" /> Sample CSV
                  </button>
                  {employees.length > 0 && (
                    <div className="bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />{" "}
                      {employees.length} Loaded
                    </div>
                  )}
                </div>

                {employees.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-2 rounded text-sm font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        {...({ webkitdirectory: "", directory: "" } as any)}
                        onChange={handlePhotoFolderUpload}
                      />
                      <Upload className="w-4 h-4 shrink-0" /> Upload Photos
                      Folder
                    </label>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                1. Import CSV (Headers: name, employeeId, unitId, doj, dob,
                bloodGroup, emergencyNo)
                <br />
                2. Upload a folder containing photos named by{" "}
                <strong>EMP ID</strong> (e.g. 1016434.jpg) or{" "}
                <strong>Name</strong>.
              </p>
            </div>
          </div>

          <div className="mt-auto pt-8 flex gap-2">
            <button
              onClick={() => {
                handleInputChange("photoScale", 1);
                handleInputChange("photoOffsetX", 0);
                handleInputChange("photoOffsetY", 0);
              }}
              className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-md font-semibold text-xs border border-slate-200 hover:bg-slate-200"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="flex-[1.5] bg-green-600 text-white py-2.5 rounded-md font-semibold text-xs hover:bg-green-700 shadow-md flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Details
            </button>
            <button
              onClick={handleDownloadSingleBoth}
              disabled={isGenerating}
              className="flex-[1.5] bg-blue-700 text-white py-2.5 rounded-md font-semibold text-xs hover:bg-blue-800 shadow-lg shadow-blue-200 flex items-center justify-center gap-1 disabled:opacity-70 disabled:cursor-wait"
            >
              {isGenerating ? (
                "Wait..."
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Preview Canvas */}
        <section className="flex-1 bg-slate-200 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 overflow-y-visible lg:overflow-y-auto min-h-[500px] lg:min-h-0">
          <div className="relative origin-center scale-[0.75] min-[450px]:scale-[0.9] sm:scale-100 transition-transform duration-200 my-8 sm:my-0">
            {/* Floating Badge Label */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-4 py-1 rounded-full shadow-sm border border-slate-300 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 z-10 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>{" "}
              Live Real-time Preview
            </div>

            {/* The ID Card */}
            <div
              ref={cardRef}
              className="w-[420px] h-[670px] rounded-md flex flex-col overflow-hidden relative font-sans"
              style={{
                backgroundImage: bgImage ? `url(${bgImage})` : `url(${defaultBgImage})`,
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                backgroundColor: "transparent",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >

              {/* Top empty space for the logo in the background image */}
              <div className="h-[120px] w-full shrink-0"></div>

              {/* Card Content - Fields aligned as in the template */}
              <div className="flex-1 px-8 flex flex-col pt-4 relative z-10 space-y-[22px]">
                <div
                  className="h-[22px] relative text-[15px] font-black leading-tight w-full"
                  style={{ color: "#222222" }}
                >
                  <div className="absolute bottom-0 left-0 w-[140px] uppercase">
                    NAME
                  </div>
                  <div className="absolute bottom-0 left-[140px] w-4">:</div>
                  <div
                    className="absolute bottom-0 left-[156px] right-0 uppercase break-words"
                    style={{ wordBreak: "break-word" }}
                  >
                    {currentEmployee.name || " "}
                  </div>
                </div>

                <div
                  className="h-[22px] relative text-[15px] font-black leading-tight w-full"
                  style={{ color: "#222222" }}
                >
                  <div className="absolute bottom-0 left-0 w-[140px] uppercase">
                    EMP ID
                  </div>
                  <div className="absolute bottom-0 left-[140px] w-4">:</div>
                  <div
                    className="absolute bottom-0 left-[156px] right-0 uppercase break-words"
                    style={{ wordBreak: "break-word" }}
                  >
                    {currentEmployee.employeeId || " "}
                  </div>
                </div>

                <div
                  className="h-[22px] relative text-[15px] font-black leading-tight w-full"
                  style={{ color: "#222222" }}
                >
                  <div className="absolute bottom-0 left-0 w-[140px] uppercase">
                    UNIT
                  </div>
                  <div className="absolute bottom-0 left-[140px] w-4">:</div>
                  <div
                    className="absolute bottom-0 left-[156px] right-0 uppercase break-words"
                    style={{ wordBreak: "break-word" }}
                  >
                    {currentRegion.name.toUpperCase()}
                  </div>
                </div>

                <div
                  className="h-[22px] relative text-[15px] font-black leading-tight w-full"
                  style={{ color: "#222222" }}
                >
                  <div className="absolute bottom-0 left-0 w-[140px] uppercase">
                    D.O.J
                  </div>
                  <div className="absolute bottom-0 left-[140px] w-4">:</div>
                  <div
                    className="absolute bottom-0 left-[156px] right-0 uppercase break-words"
                    style={{ wordBreak: "break-word" }}
                  >
                    {currentEmployee.doj || " "}
                  </div>
                </div>

                <div
                  className="h-[22px] relative text-[15px] font-black leading-tight w-full"
                  style={{ color: "#222222" }}
                >
                  <div className="absolute bottom-0 left-0 w-[140px] uppercase">
                    D.O.B
                  </div>
                  <div className="absolute bottom-0 left-[140px] w-4">:</div>
                  <div
                    className="absolute bottom-0 left-[156px] right-0 uppercase break-words"
                    style={{ wordBreak: "break-word" }}
                  >
                    {currentEmployee.dob || " "}
                  </div>
                </div>

                <div
                  className="h-[22px] relative text-[15px] font-black leading-tight w-full"
                  style={{ color: "#222222" }}
                >
                  <div className="absolute bottom-0 left-0 w-[140px] uppercase">
                    BLOOD GROUP
                  </div>
                  <div className="absolute bottom-0 left-[140px] w-4">:</div>
                  <div
                    className="absolute bottom-0 left-[156px] right-0 uppercase break-words"
                    style={{ wordBreak: "break-word" }}
                  >
                    {currentEmployee.bloodGroup || " "}
                  </div>
                </div>

                <div
                  className="h-[22px] relative text-[15px] font-black leading-tight w-full"
                  style={{ color: "#222222" }}
                >
                  <div className="absolute bottom-0 left-0 w-[140px] uppercase">
                    EMERGENCY NO
                  </div>
                  <div className="absolute bottom-0 left-[140px] w-4">:</div>
                  <div
                    className="absolute bottom-0 left-[156px] right-0 uppercase break-words"
                    style={{ wordBreak: "break-word" }}
                  >
                    {currentEmployee.emergencyNo || " "}
                  </div>
                </div>
              </div>

              {/* Bottom Section: Photo, Signature, Company Address */}
              <div className="h-[210px] w-full relative shrink-0 mt-2">
                {/* Photo Square */}
                <div
                  className="absolute bottom-[90px] left-8 w-[125px] h-[155px] border-2 overflow-hidden z-20 flex items-center justify-center"
                  style={{
                    backgroundColor: "#e2e8f0",
                    borderColor: "#ffffff",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  }}
                >
                  {currentEmployee.photoUrl ? (
                    <img
                      src={currentEmployee.photoUrl}
                      alt="Employee"
                      className="w-full h-full absolute"
                      style={{
                        objectFit: "cover",
                        objectPosition: `calc(50% + ${currentEmployee.photoOffsetX || 0}px) calc(50% + ${currentEmployee.photoOffsetY || 0}px)`,
                        transform: `scale(${currentEmployee.photoScale || 1})`,
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center relative z-10"
                      style={{ backgroundColor: "#f1f5f9" }}
                    >
                      <Users
                        className="w-10 h-10"
                        style={{ color: "#94a3b8", opacity: 0.5 }}
                      />
                    </div>
                  )}
                </div>



                {/* Company Address Section */}
                <div className="absolute bottom-2 left-0 w-full h-[75px] text-center px-1 flex flex-col items-center justify-start">
                  <h2
                    className="text-[19px] font-black mb-[2px]"
                    style={{ color: "#111111" }}
                  >
                    CAVINKARE PRIVATE LIMITED
                  </h2>
                  <p
                    className="text-[12px] font-bold leading-[1.2] whitespace-pre tracking-tight"
                    style={{ color: "#111111" }}
                  >
                    {currentRegion.address}
                  </p>
                  {currentRegion.phone && (
                    <p
                      className="text-[12.5px] font-bold mt-[2px] tracking-tight"
                      style={{ color: "#111111" }}
                    >
                      PHONE : {currentRegion.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            {isBatchMode ? (
              <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => {
                    const idx = employees.findIndex(
                      (e) => e.id === currentEmployee.id,
                    );
                    if (idx > 0) setCurrentEmployee(employees[idx - 1]);
                  }}
                  disabled={
                    employees.findIndex((e) => e.id === currentEmployee.id) ===
                    0
                  }
                  className="px-4 py-3 bg-white rounded-lg shadow-sm border border-slate-300 text-sm font-bold text-slate-700 disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-slate-300 text-sm font-bold text-slate-700">
                  {employees.findIndex((e) => e.id === currentEmployee.id) + 1}{" "}
                  of {employees.length}
                </div>
                <button
                  onClick={() => {
                    const idx = employees.findIndex(
                      (e) => e.id === currentEmployee.id,
                    );
                    if (idx < employees.length - 1)
                      setCurrentEmployee(employees[idx + 1]);
                  }}
                  disabled={
                    employees.findIndex((e) => e.id === currentEmployee.id) ===
                    employees.length - 1
                  }
                  className="px-4 py-3 bg-white rounded-lg shadow-sm border border-slate-300 text-sm font-bold text-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  onClick={() => generateBulkZip("both")}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-blue-700 rounded-lg shadow-lg border border-blue-800 text-sm font-bold text-white flex items-center gap-2 disabled:opacity-75"
                >
                  <Download className="w-4 h-4" />{" "}
                  {isGenerating ? "Generating ZIP..." : "Export All (ZIP)"}
                </button>
              </div>
            ) : (
              <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
                <button
                  onClick={handleDownloadSingleBoth}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-white rounded-lg shadow-sm border border-slate-300 text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-70"
                >
                  <Download className="w-4 h-4" /> Download Digital
                </button>
                <button 
                  onClick={() => generateBulkZip("both")}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-blue-700 rounded-lg shadow-lg border border-blue-800 text-sm font-bold text-white flex items-center gap-2 hover:bg-blue-800 transition-colors disabled:opacity-70"
                >
                  <Users className="w-4 h-4" /> Print Bulk Orders
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Instruction Area */}
      <footer className="h-auto min-h-12 bg-slate-900 text-slate-400 flex flex-col md:flex-row items-center px-6 py-3 md:py-0 text-[11px] gap-4 md:gap-8 shrink-0 text-center md:text-left">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>{" "}
          App Engine Active
        </div>
        <div className="flex items-center gap-2">
          <strong className="text-slate-300">Tip:</strong> <span className="text-center">For batch processing, select the 'Import CSV' option to generate cards for multiple users simultaneously.</span>
        </div>
        <div className="md:ml-auto flex items-center gap-2 md:gap-4">
          <span className="font-semibold text-slate-300">Powered by </span>
          <img
              src={digifoxlogo}
              alt="DigiFox Logo"
              className="w-16 h-10 object-contain"
            />
        </div>
      </footer>
    </div>
  );
}
