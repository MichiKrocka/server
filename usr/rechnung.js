require("dotenv").config();

var pdf     = require('html-pdf'),
    util    = require('util'),
    sprintf = require("sprintf-js").sprintf,
    sqlite3 = require('sqlite3'),
    fs      = require('fs');
// ---------------------------------------------------------
const nodemailer = require("nodemailer");

const createTransporter = async () => {
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP,
    port: 465,
    secure: true, // true for 465, false for other ports
    tls: {rejectUnauthorized: false},
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PSWD
    },
  });

  return transporter;
};
// ---------------------------------------------------------
const sendEmail = async (emailOptions) => {
  let emailTransporter = await createTransporter();
  await emailTransporter.sendMail(emailOptions);
};
// ---------------------------------------------------------
var REGEXP = "/usr/lib/sqlite3/pcre.so",
    BASE   = "/home/krocka/server/www/krocka.goip.de/data/michi_sql/michi.sqlite";
// ---------------------------------------------------------
var d = new Date();

d.setMonth(d.getMonth()-1);
// .........................................................
var oSQL = new sqlite3.Database(BASE);

oSQL.run("PRAGMA busy_timesHtml = 4000");
oSQL.on("error", function(err){
  console.log("SQL", err.message);
});
if(fs.existsSync(REGEXP))
  oSQL.loadExtension(REGEXP);

var sTmp = fs.readFileSync('rechnung.htm', 'utf8');

var SQLinsert = `
INSERT INTO bill
 (id,fid,bill,close,duration,VAT,rate,other,x,note)
 VALUES (
  (SELECT max(id) FROM bill) + 1, $fid,
  date('now'), date('now'),
  $duration, $VAT, $rate, $other, '-', $note)`;
var SQLquery = `
SELECT
  f.name || "\n" || f.street || "\n" ||
  f.zip || " "|| f.city || "\n" || f.country      AS addr,
  strftime("%d.%m.%Y", "now")                     AS now,
  "/" || strftime("%m-%Y", "now")                 AS nr,
  duration                                        AS dauer,
  printf("%.2f",rate)                             AS stundenlohn,
  printf("%.2f", ((substr(duration, 1,
    length(duration) - 3) +
    substr(duration, -2) / 60.0) * rate ))        AS netto,
  printf("%.2f", other)                           AS sonstiges,
  printf("%.2f", vat)                             AS mwst,
  printf("%.2f", ((substr(duration, 1,
    length(duration) - 3) +
    substr(duration, -2) / 60.0) *
    rate + other) * VAT / 100.0)                  AS steuer,
  printf("%.2f", ((substr(duration, 1,
    length(duration) - 3) +
    substr(duration, -2) / 60.0) * rate + other) *
    (100.0 + VAT) / 100.0)                        AS brutto,
  b.note                                          AS note,
  fid, duration, VAT, rate, other,
  f.contact, f.name
FROM
  bill b LEFT JOIN firm f ON b.fid=f.id
WHERE
  x="o"
`;
// .........................................................
oSQL.all(SQLquery, {}, function(err, raw){
  if(err)
    console.log(SQLquery, err);
  else {
    // .....................................................
    raw.forEach(r => {
      r.email = JSON.parse(r.contact)
                .filter(a => a.p == "EMAIL")
                .map(a => a.v)
                .join(",");
      r.note = r.note
               .replace(/#jahr#/g, d.getFullYear())
               .replace(/#monat#/g, d.getMonth() + 1);

      //fs.writeFileSync("/tmp/"+r.bid+".html", sHtml);
      var par = {
        $fid:      r.fid,
        $duration: r.duration,
        $VAT:      r.VAT,
        $rate:     r.rate,
        $other:    r.other,
        $note:     r.note
      };
      // ...................................................
      oSQL.run(SQLinsert, par, function(err, d){
        r.bid = this.lastID;
        r.nr  = this.lastID+r.nr;

        var sHtml = sTmp,
            pdfFile = "/tmp/"+r.bid+".pdf";

        for(var x in r)
          sHtml = sHtml.replace(`#${x}#`, r[x]);
        
        pdf.create(sHtml, {
          "format": 'A4',
          "border": {
            "top":    "1cm",
            "right":  "1cm",
            "bottom": "1cm",
            "left":   "1cm"
           },      
          childProcessOptions: {
            env: {
              OPENSSL_CONF: '/dev/null',
            },
          },
        }).toFile(pdfFile, function(err, res) {
          if(err)
            return console.log(err);
          else {
            sendEmail({
              subject: "Rechnung",
              text:    r.name,
              to:      r.email,
//              to:      "michael.krocka@gmail.com",
              cc:      "michael.krocka@gmail.com",
              from:    process.env.SMTP_EMAIL,
              attachments: [{
                filename: "rechnung.pdf",
                path:     pdfFile,
                type:     'application/pdf',
              }],
            });
          }
        });

      });
      // ...................................................
    });
    // .....................................................
  }
});
