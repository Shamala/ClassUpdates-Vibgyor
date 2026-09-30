/**
 * The dashboard's shared state and the constants read alongside it.
 */

const API_BASE = "";
const ORION_APP_URL = "https://hubbleorion.hubblehox.com/";

// Application State
const state = {
  currentTab: "daily",
  selectedDate: null,
  availableDates: [],
  student: null,
  dailyData: null,
  weeklyData: null,
  circulars: [],
  selectedCircularCategory: "all",
  circularSearchTerm: "",
  isSyncing: false,
  isAuthenticated: false,
  authToken: localStorage.getItem("orion_auth_token") || "",
  currentUser: null,
};

const wordModalState = {
  mode: "bank", // 'bank' or 'drill'
  drillIndex: 0,
  drillWords: [],
  isWordHidden: false,
  collapsedWeeks: {}, // mondayKey: boolean
};

const DEMO_STUDENT = {
  id: 1,
  student_id: "DEMO-G1F-001",
  name: "Demo Student",
  grade: "Grade 1",
  section: "F",
  school: "VIBGYOR High (Demo)",
  academic_year: "2026 - 27",
  roll_no: "01",
  parent_name: "Demo Parent",
};

// What the app shows when nothing better is known about the student.
const GENERIC_STUDENT_FIELDS = {
  grade: "Grade 1",
  section: "F",
  school: "VIBGYOR High",
  academic_year: "2026 - 27",
};

export {
  API_BASE,
  ORION_APP_URL,
  state,
  wordModalState,
  DEMO_STUDENT,
  GENERIC_STUDENT_FIELDS,
};
