const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6kqZxto92mLOMU9aBMEIuMDZfxqUJlj3U7STFBClvPfoN33JVtvCmIRjVzEU3g-JenOUKNLIJ-Qn3/pub?gid=0&single=true&output=csv&cachebust=" + new Date().getTime();

function colToIndex(letter){ return letter.charCodeAt(0)-65; }

function loadData(){
  Papa.parse(CSV_URL, {
    download:true,
    skipEmptyLines:true,
    complete:function(results){
      const data = results.data;

      // Set page title from B3
      const pageTitle = data[2][1]?.trim() || "Reiki & Restore Collective";
      document.getElementById("pageTitle").textContent = pageTitle;

      const classDefs = [
        { locCol:"B", dateCol:"B", partCol:"C", partStartRow:6 },
        { locCol:"D", dateCol:"D", partCol:"E", partStartRow:6 },
        { locCol:"F", dateCol:"F", partCol:"G", partStartRow:6 },
        { locCol:"H", dateCol:"H", partCol:"I", partStartRow:6 }
      ];

      const classes = [];

      classDefs.forEach(cls=>{
        const loc = data[3][colToIndex(cls.locCol)]?.trim() || "";
        const date = data[4][colToIndex(cls.dateCol)]?.trim() || "";
        const participants = [];

        for(let r=cls.partStartRow-1; r<data.length; r++){
          let val = data[r][colToIndex(cls.partCol)];
          if(val?.trim()){
            val = val.replace(/\s*\([^)]*\)/g,'').trim(); // remove timestamps
            if(val) participants.push(val);
          }
        }
        classes.push({location:loc, date:date, participants});
      });

      renderClasses(classes);
    }
  });
}

function renderClasses(classes){
  const container = document.getElementById("classes");
  container.style.display="block";
  container.innerHTML="";

  classes.forEach((cls,i)=>{
    const div = document.createElement("div");
    div.className="class-container";

    // Location + headcount
    const locElem = document.createElement("div");
    locElem.className="class-location";
    const locText = document.createTextNode(cls.location + " ");
    locElem.appendChild(locText);

    const countSpan = document.createElement("span");
    countSpan.textContent = `- ${cls.participants.length} healer${cls.participants.length!==1?'s':''}`;
    countSpan.style.color="white";
    countSpan.style.textShadow="0 0 5px rgba(197,155,90,0.6)";
    locElem.appendChild(countSpan);

    // Date
    const dateElem = document.createElement("div");
    dateElem.className="class-date";
    dateElem.textContent = cls.date;

    // Participant list
    const ul = document.createElement("ul");
    cls.participants.sort((a,b)=>a.localeCompare(b)).forEach(p=>{
      const li = document.createElement("li");
      li.textContent=p;
      ul.appendChild(li);
    });

    // Remaining spaces link at bottom
    const remaining = 15 - cls.participants.length;
    const remainLink = document.createElement("a");
    remainLink.href="https://tinyurl.com/ReikiReg";
    remainLink.target="_blank";
    remainLink.style.fontSize="18px";
    remainLink.style.color="#c59b5a";
    remainLink.style.textDecoration="none";
    remainLink.style.marginTop="12px";
    remainLink.style.display="block";

    remainLink.innerHTML = `
      <span style="display:inline-flex; align-items:center; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#c59b5a" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 4px #c59b5a);">
          <path d="M8 5l8 7-8 7V5z"/>
        </svg>
        ${remaining>0 ? `${remaining} spaces remaining` : 'Class full – standby available'}
      </span>
    `;

    remainLink.addEventListener("mouseenter",()=>remainLink.style.textShadow="0 0 8px rgba(255,215,140,0.9)");
    remainLink.addEventListener("mouseleave",()=>remainLink.style.textShadow="none");

    div.appendChild(locElem);
    div.appendChild(dateElem);
    div.appendChild(ul);
    div.appendChild(remainLink);

    container.appendChild(div);

    // Card animation
    setTimeout(()=>{
      div.style.opacity="1";
      div.style.transform="translateY(0)";
    }, i*150);
  });
}

// Sparkle particles
const canvas = document.getElementById("sparkleCanvas");
const ctx = canvas.getContext("2d");
let width=canvas.width=window.innerWidth;
let height=canvas.height=window.innerHeight;

const particles=[];
const particleCount=80;
for(let i=0;i<particleCount;i++){
  particles.push({x:Math.random()*width, y:Math.random()*height, r:Math.random()*2+1, speed:Math.random()*0.3+0.1, alpha:Math.random(), alphaDir:Math.random()>0.5?0.01:-0.01});
}

function animate(){
  ctx.clearRect(0,0,width,height);
  particles.forEach(p=>{
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(197,155,90,${p.alpha})`;
    ctx.fill();
    p.y+=p.speed;
    p.alpha+=p.alphaDir;
    if(p.alpha>=1){p.alpha=1;p.alphaDir=-p.alphaDir;}
    if(p.alpha<=0){p.alpha=0;p.alphaDir=-p.alphaDir;}
    if(p.y>height){p.y=0;p.x=Math.random()*width;}
  });
  requestAnimationFrame(animate);
}
animate();

window.addEventListener("resize",()=>{
  width=canvas.width=window.innerWidth;
  height=canvas.height=window.innerHeight;
});

// Load data on page load
loadData();


