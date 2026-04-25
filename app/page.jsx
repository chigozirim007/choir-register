"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query } from "firebase/firestore";
import { db } from "../config/firebase.config";

// Helper to get the YYYY-MM-DD of the Monday of the given date's week
function getWeekId(dateObj) {
  const date = new Date(dateObj);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diffToMonday));
  return monday.toISOString().split('T')[0];
}

export default function ChoirApp() {
  const [attendance, setAttendance] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("current"); // "current" or "history"
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    surname: "",
    part: "Soprano",
    day: "Tuesday", // Default to Tuesday instead of Monday
  });

  const attendanceCollectionRef = collection(db, "attendance");
  const currentWeekId = getWeekId(new Date());

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const data = await getDocs(attendanceCollectionRef);
        setAttendance(data.docs.map((doc) => {
          const docData = doc.data();
          // Fallback weekId for older records if any
          const weekId = docData.weekId || getWeekId(docData.timestamp?.toDate ? docData.timestamp.toDate() : new Date());
          return { ...docData, id: doc.id, weekId };
        }));
      } catch (err) {
        console.error("Error fetching attendance:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchAttendance();
  }, []);

  const addEntry = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    if (formData.day !== currentDayName) {
      setErrorMessage(`Invalid day! Today is ${currentDayName}. You can only sign attendance for today.`);
      return;
    }

    const newEntry = { 
      ...formData, 
      timestamp: new Date(),
      weekId: getWeekId(new Date())
    };
    
    try {
      const docRef = await addDoc(attendanceCollectionRef, newEntry);
      setAttendance([...attendance, { ...newEntry, id: docRef.id }]);
      setFormData({ ...formData, firstName: "", surname: "" });
    } catch (err) {
      console.error("Error adding entry:", err);
    }
  };

  // Grouping logic for CURRENT WEEK Eligibility
  const getCurrentWeekEligibility = () => {
    const members = {};
    const currentWeekData = attendance.filter(record => record.weekId === currentWeekId);
    
    currentWeekData.forEach((record) => {
      const name = `${record.firstName} ${record.surname}`;
      if (!members[name]) {
        members[name] = { ...record, uniqueDays: new Set() };
      }
      members[name].uniqueDays.add(record.day);
    });

    return Object.values(members).map((m) => ({
      ...m,
      count: m.uniqueDays.size,
      eligible: m.uniqueDays.size >= 2,
    }));
  };

  // Grouping logic for ALL-TIME History
  const getHistory = () => {
    const members = {};
    
    // First, group by member and then by week to calculate weekly eligibility
    attendance.forEach((record) => {
      const name = `${record.firstName} ${record.surname}`;
      if (!members[name]) {
        members[name] = { 
          firstName: record.firstName, 
          surname: record.surname, 
          part: record.part, 
          weeks: {}, // weekId -> set of unique days
          totalRehearsals: 0
        };
      }
      
      if (!members[name].weeks[record.weekId]) {
        members[name].weeks[record.weekId] = new Set();
      }
      members[name].weeks[record.weekId].add(record.day);
      members[name].totalRehearsals++;
    });

    // Calculate total eligible weeks per member
    return Object.values(members).map((m) => {
      let eligibleWeeks = 0;
      Object.values(m.weeks).forEach(daysSet => {
        if (daysSet.size >= 2) eligibleWeeks++;
      });
      
      return {
        ...m,
        eligibleWeeks,
        totalWeeksAttended: Object.keys(m.weeks).length
      };
    });
  };

  const currentEligibilityList = getCurrentWeekEligibility();
  const historyList = getHistory();

  return (
    <div className="min-h-screen bg-[#eceff1] p-4 md:p-8 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Choir Register</h1>
            <p className="text-gray-600">Weekly Attendance & Sunday Eligibility</p>
          </div>
        </header>

        {/* FORM SECTION */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add Member Entry</h2>
          
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
              <p className="font-medium">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={addEntry} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Surname"
              className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.surname}
              onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              required
            />
            
            <div className="flex flex-col">
              <label className="text-sm text-gray-500 ml-1 mb-1">Voice Part</label>
              <select
                className="border border-gray-300 p-3 rounded-lg bg-white"
                value={formData.part}
                onChange={(e) => setFormData({ ...formData, part: e.target.value })}
              >
                <option>Soprano</option>
                <option>Alto</option>
                <option>Tenor</option>
                <option>Bass</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-500 ml-1 mb-1">Rehearsal Day</label>
              <select
                className="border border-gray-300 p-3 rounded-lg bg-white"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
              >
                {["Tuesday", "Thursday", "Saturday"].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <button className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg active:scale-95">
              Submit Attendance
            </button>
          </form>
        </div>

        {/* TABS & LISTS */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex border-b border-gray-100 bg-gray-50">
            <button 
              className={`flex-1 p-4 font-bold text-center transition-colors ${activeTab === "current" ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-100"}`}
              onClick={() => setActiveTab("current")}
            >
              Current Week (Roll-Out)
            </button>
            <button 
              className={`flex-1 p-4 font-bold text-center transition-colors ${activeTab === "history" ? "text-blue-700 border-b-2 border-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-100"}`}
              onClick={() => setActiveTab("history")}
            >
              All-Time History
            </button>
          </div>
          
          <div className="overflow-x-auto">
            {loadingData ? (
              <div className="p-8 text-center text-gray-500">Loading data...</div>
            ) : activeTab === "current" ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <th className="p-4">Name</th>
                    <th className="p-4">Part</th>
                    <th className="p-4">Rehearsals (This Week)</th>
                    <th className="p-4 text-right">Sunday Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEligibilityList.map((member, idx) => (
                    <tr key={idx} className="border-b hover:bg-blue-50 transition-colors">
                      <td className="p-4 font-semibold">{member.firstName} {member.surname}</td>
                      <td className="p-4 text-gray-600">{member.part}</td>
                      <td className="p-4">
                        <span className="bg-gray-200 px-3 py-1 rounded-full text-sm font-bold">
                          {member.count}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {member.eligible ? (
                          <span className="text-green-600 font-bold px-3 py-1 bg-green-100 rounded-lg">✓ READY TO ROBE</span>
                        ) : (
                          <span className="text-red-500 font-bold px-3 py-1 bg-red-50 rounded-lg">✕ INELIGIBLE</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {currentEligibilityList.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-400">No data entered for this week.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <th className="p-4">Name</th>
                    <th className="p-4">Part</th>
                    <th className="p-4">Total Rehearsals</th>
                    <th className="p-4 text-right">Weeks Eligible</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((member, idx) => (
                    <tr key={idx} className="border-b hover:bg-blue-50 transition-colors">
                      <td className="p-4 font-semibold">{member.firstName} {member.surname}</td>
                      <td className="p-4 text-gray-600">{member.part}</td>
                      <td className="p-4">
                        <span className="text-gray-700 font-medium">{member.totalRehearsals} overall</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-bold">
                          {member.eligibleWeeks} / {member.totalWeeksAttended}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {historyList.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-400">No history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}