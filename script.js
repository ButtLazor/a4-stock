/* BASE */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  background-color: #f4f4f4;
  color: #333;
  transition: background 0.3s, color 0.3s;
}

/* HEADER */
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #006FA1;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

header h1 i {
  margin-right: 10px;
}

/* ICON BUTTONS */
.icon-btn {
  margin-left: 12px;
  padding: 10px 12px;
  border: none;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  cursor: pointer;
  color: white;
  font-size: 1.1rem;
  transition: 0.25s;
}

.icon-btn:hover {
  background: rgba(255,255,255,0.35);
  transform: scale(1.12);
}

.icon-btn.active {
  background: #FEA93D !important;
  color: black !important;
}

/* TABLE */
.stock-table {
  width: 90%;
  margin: 1.5rem auto;
  border-collapse: collapse;
  font-size: 1.9rem;

  border-radius: 15px;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stock-table th, .stock-table td {
  border-bottom: 1px solid #ddd;
  padding: 1.2rem;
  text-align: center;
}

/* PREMIUM DARK COLOR THEME */
.high-stock {
  background-color: #81C784; /* Soft green */
  color: #ffffff;
  font-weight: bold;
}

.medium-stock {
  background-color: #FFD54F; /* Soft gold */
  color: #000000;
  font-weight: bold;
}

.low-stock {
  background-color: #E57373; /* Soft coral */
  color: #ffffff;
  font-weight: bold;
}

.out-of-stock {
  background-color: #EF5350; /* Premium red */
  color: #ffffff;
  font-weight: bold;
}

/* SKELETON LOADING */
.skeleton {
  height: 35px;
  background: linear-gradient(90deg, #dcdcdc 25%, #e9e9e9 50%, #dcdcdc 75%);
  background-size: 200% 100%;
  animation: skeleton 1.4s infinite;
  border-radius: 8px;
}

@keyframes skeleton {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* FOOTER */
#footer-info {
  text-align: center;
  color: #555;
  font-size: 1.2rem;
  padding-bottom: 2rem;
}

#footer-info i {
  margin-right: 6px;
}

/* DARK MODE */
body.dark {
  background-color: #1f1f1f;
  color: #eaeaea;
}

body.dark header {
  background-color: #003f5f;
}

body.dark .stock-table {
  background-color: #2a2a2a;
  box-shadow: 0 4px 12px rgba(255,255,255,0.05);
}

body.dark .stock-table th, 
body.dark .stock-table td {
  border-color: #555;
}

body.dark .skeleton {
  background: linear-gradient(90deg, #555 25%, #666 50%, #555 75%);
}

/* DARK MODE COLORS — Harmonized */
body.dark .high-stock {
  background-color: #66BB6A;
}

body.dark .medium-stock {
  background-color: #FFCA28;
  color: #000;
}

body.dark .low-stock {
  background-color: #EF5350;
}

body.dark .out-of-stock {
  background-color: #E53935;
}
