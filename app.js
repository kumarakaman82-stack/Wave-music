// Wave Music Player — Firebase setup is required. See README.md.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc,
  updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Replace these values with the Firebase web-app config from Firebase Console.
const firebaseConfig = {
  apiKey: "AIzaSyAZxmh9DFPHa_aaVc7XMrqHxFLv46Ghk1o",
  authDomain: "wave-music-ef1dc.firebaseapp.com.",
  projectId: "wave-music-ef1dc",
  storageBucket: "wave-music-ef1dc.firebasestorage.app",
  messagingSenderId: "307488266395",
  appId: "307488266395:web:2496f58c9b05224a128e3e"
};

const authView = document.querySelector("#authView"), appView = document.querySelector("#appView");
const authMsg = document.querySelector("#authMsg");
let auth, db, mode = "login", user, songs = [], playlists = [], activeView = "all", activePlaylist = null, currentIndex = -1;
let stopSongs = null, stopPlaylists = null;

const $ = s => document.querySelector(s);
function videoId(url) {
  try {
    const u = new URL(url);
    let id = u.hostname === "youtu.be" ? u.pathname.slice(1).split("/")[0] :
      u.pathname === "/watch" ? u.searchParams.get("v") :
      ["embed","shorts","live"].includes(u.pathname.split("/")[1]) ? u.pathname.split("/")[2] : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
function showMessage(msg) { authMsg.textContent = msg; }
function setMode(next) {
  mode = next; $("#loginTab").classList.toggle("secondary", mode !== "login");
  $("#signupTab").classList.toggle("secondary", mode !== "signup");
  $("#emailSubmit").textContent = mode === "login" ? "Log in with email" : "Create account";
  $("#password").autocomplete = mode === "login" ? "current-password" : "new-password";
}
$("#loginTab").onclick = () => setMode("login");
$("#signupTab").onclick = () => setMode("signup");
$("#authForm").addEventListener("submit", async e => {
  e.preventDefault(); showMessage("Please wait…");
  try {
    const email = $("#email").value.trim(), password = $("#password").value;
    if (mode === "signup") await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
  } catch (e) { showMessage(e.message); }
});
$("#googleBtn").onclick = async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (e) { showMessage(e.message); }
};
$("#logoutBtn").onclick = () => signOut(auth);

function userCollection(name) { return collection(db, "users", user.uid, name); }
function currentSongs() {
  if (activeView === "favorites") return songs.filter(s => s.favorite);
  if (activeView === "recent") return [...songs].filter(s => s.lastPlayed).sort((a,b) => (b.lastPlayed?.seconds||0)-(a.lastPlayed?.seconds||0));
  if (activeView === "playlist") {
    const p = playlists.find(x => x.id === activePlaylist);
    return songs.filter(s => p?.songIds?.includes(s.id));
  }
  return songs;
}
function render() {
  $("#pageTitle").textContent = activeView === "playlist" ? (playlists.find(p=>p.id===activePlaylist)?.name || "Playlist") :
    ({all:"All songs",favorites:"Favorites",recent:"Recently played"}[activeView]);
  document.querySelectorAll(".navbtn").forEach(b => b.classList.toggle("active", b.dataset.view === activeView));
  $("#playlistList").innerHTML = "";
  playlists.forEach(p => {
    const row = document.createElement("div"); row.className = "playlist-item";
    const open = document.createElement("button"); open.className = "secondary"; open.textContent = "♫ " + p.name;
    open.onclick = () => { activeView="playlist"; activePlaylist=p.id; render(); };
    const del = document.createElement("button"); del.className="danger"; del.textContent="×"; del.title="Delete playlist";
    del.onclick = async () => { if(confirm(`Delete playlist "${p.name}"?`)) await deleteDoc(doc(db,"users",user.uid,"playlists",p.id)); };
    row.append(open,del); $("#playlistList").append(row);
  });
  const list = $("#songList"); list.innerHTML = "";
  const shown = currentSongs();
  if (!shown.length) { list.innerHTML = '<div class="empty">No songs here yet. Add a YouTube video above.</div>'; return; }
  shown.forEach(song => {
    const row = document.createElement("div"); row.className="song";
    const info = document.createElement("div");
    const title = document.createElement("div"); title.className="songtitle"; title.textContent=song.title;
    const artist = document.createElement("div"); artist.className="songmeta"; artist.textContent=song.artist || "Unknown artist";
    info.append(title,artist);
    const actions = document.createElement("div"); actions.className="songactions";
    const play = document.createElement("button"); play.textContent="▶ Play"; play.onclick=()=>playSong(song);
    const fav = document.createElement("button"); fav.className="secondary"; fav.textContent=song.favorite?"♥":"♡";
    fav.onclick=()=>updateDoc(doc(db,"users",user.uid,"songs",song.id),{favorite:!song.favorite});
    const add = document.createElement("button"); add.className="secondary"; add.textContent="+ Playlist";
    add.onclick=async()=>{
      if(!playlists.length){alert("Create a playlist first.");return;}
      const choice=prompt("Enter playlist name:\n"+playlists.map(p=>p.name).join("\n"));
      const p=playlists.find(x=>x.name.toLowerCase()===choice?.trim().toLowerCase());
      if(p) await updateDoc(doc(db,"users",user.uid,"playlists",p.id),{songIds:[...new Set([...(p.songIds||[]),song.id])]});
      else if(choice) alert("Playlist not found.");
    };
    const remove=document.createElement("button"); remove.className="danger"; remove.textContent="Remove";
    remove.onclick=async()=>{if(confirm("Remove this song from your library?")) await deleteDoc(doc(db,"users",user.uid,"songs",song.id));};
    actions.append(play,fav,add,remove); row.append(info,actions); list.append(row);
  });
}
async function playSong(song) {
  const idx=songs.findIndex(s=>s.id===song.id); currentIndex=idx;
  $("#nowTitle").textContent=song.title; $("#nowArtist").textContent=song.artist||"";
  $("#videoFrame").src=`https://www.youtube-nocookie.com/embed/${song.videoId}?autoplay=1&rel=0`;
  await updateDoc(doc(db,"users",user.uid,"songs",song.id),{lastPlayed:serverTimestamp()});
}
$("#addSongBtn").onclick=async()=>{
  const title=$("#songTitle").value.trim(), artist=$("#songArtist").value.trim(), id=videoId($("#songUrl").value.trim());
  if(!title || !id){alert("Enter a song title and a valid YouTube video URL.");return;}
  await addDoc(userCollection("songs"),{title,artist,videoId:id,favorite:false,createdAt:serverTimestamp()});
  $("#songTitle").value="";$("#songArtist").value="";$("#songUrl").value="";
};
$("#newPlaylistBtn").onclick=async()=>{
  const name=prompt("Playlist name?");
  if(name?.trim()) await addDoc(userCollection("playlists"),{name:name.trim(),songIds:[],createdAt:serverTimestamp()});
};
document.querySelectorAll(".navbtn").forEach(b=>b.onclick=()=>{activeView=b.dataset.view;activePlaylist=null;render();});
$("#nextBtn").onclick=()=>{if(songs.length) playSong(songs[(currentIndex+1+songs.length)%songs.length]);};
$("#prevBtn").onclick=()=>{if(songs.length) playSong(songs[(currentIndex-1+songs.length)%songs.length]);};

try {
  if (firebaseConfig.apiKey.startsWith("YOUR_")) throw new Error("Add your Firebase config in app.js first. Follow README.md.");
  const app=initializeApp(firebaseConfig); auth=getAuth(app); db=getFirestore(app);
  onAuthStateChanged(auth, async u=>{
    user=u;
    authView.classList.toggle("hidden",!!u); appView.classList.toggle("hidden",!u);
    if(!u){if(stopSongs)stopSongs();if(stopPlaylists)stopPlaylists();return;}
    $("#userLabel").textContent=u.email||"Signed in with Google";
    stopSongs=onSnapshot(userCollection("songs"),snap=>{songs=snap.docs.map(d=>({id:d.id,...d.data()}));render();});
    stopPlaylists=onSnapshot(userCollection("playlists"),snap=>{playlists=snap.docs.map(d=>({id:d.id,...d.data()}));render();});
  });
} catch(e) { showMessage(e.message); }
