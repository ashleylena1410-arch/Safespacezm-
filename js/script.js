// ADMIN PASSWORD (Demo Only)
const ADMIN_PASSWORD = "SafeSpaceAdmin2026";

// Donations stored locally (demo)
function getDonations() {
  return JSON.parse(localStorage.getItem("sszmDonations") || "[]");
}

function saveDonations(data) {
  localStorage.setItem("sszmDonations", JSON.stringify(data));
}

// Handle Donation Submission
document.getElementById("donationForm").addEventListener("submit", function(e){
  e.preventDefault();

  const name = document.getElementById("donorName").value.trim();
  const amount = document.getElementById("donationAmount").value.trim();
  const org = document.getElementById("donorOrg").value.trim();
  const msg = document.getElementById("donorMsg").value.trim();

  const donations = getDonations();

  donations.push({
    name,
    amount,
    org,
    msg,
    date: new Date().toLocaleString()
  });

  saveDonations(donations);

  document.getElementById("donationSuccess").textContent =
    "Thank you! Your Airtel Money donation has been recorded.";

  this.reset();
});

// ADMIN LOGIN
function adminLogin(){
  const pw = document.getElementById("adminPw").value;

  if(pw === ADMIN_PASSWORD){
    document.getElementById("adminLoginBox").style.display = "none";
    document.getElementById("adminDash").style.display = "block";
    loadAdminData();
  } else {
    const err = document.getElementById("loginErr");
    err.style.display = "block";
    setTimeout(()=> err.style.display="none",2000);
  }
}

function adminLogout(){
  document.getElementById("adminLoginBox").style.display = "block";
  document.getElementById("adminDash").style.display = "none";
  document.getElementById("adminPw").value="";
}

function loadAdminData(){
  const list = document.getElementById("adminDonList");
  const donations = getDonations();

  if(donations.length === 0){
    list.innerHTML = "<p>No donations yet.</p>";
    return;
  }

  list.innerHTML = donations.map(d =>
    `<div>
      <strong>${d.name}</strong> – ZMW ${d.amount}<br/>
      <small>${d.date}</small>
      <hr/>
    </div>`
  ).join("");
}
