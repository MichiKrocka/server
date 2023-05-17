// -------------------------------------------------------------------
var http       = require('http'),
    util       = require('util'),
    formidable = require('formidable'),
    url        = require('url'),
    fs         = require('fs'),
    mime       = require('mime-types'),
    sqlite3    = require('sqlite3'),
    email      = require('emailjs'),
    exec       = require('child_process').exec,
    extend     = require('extend');
// -------------------------------------------------------------------
var LOG            = false,
    PORT           = 9000,
    DIR_MOD        = "mod",
    SQL_ERROR_TIME = 300,
    REGEXP         = "/usr/lib/sqlite3/pcre.so",
    INDEX          = "/home/krocka/server/index/",
    INDEX_DB       = "/home/krocka/server/",
    HTTP_DEFAULT_PAGE = ["index.htm", "index.html"],
    REJECT = [
      /^\/$/,
      /^\/database\/.*$/,
    ];
// -------------------------------------------------------------------
process.chdir(INDEX_DB);
var pwd = process.cwd(),
    server;
var HTML =
  '<!DOCTYPE html>'+
  '<html lang="en">'+
    '<head>'+
      '<title>directory</title>'+
      '<meta charset="UTF-8"/>'+
    '</head>'+
    '<body>'+
      '%s'+
    '</body>'+
  '</html>';
// -------------------------------------------------------------------
server = http.createServer(function(oReq, oRes) {
  var oPar = {
        oFields: {},
        oFiles: {}
      },
      oUrl,
      urlTyp,
      sBody = "";
  //..................................................................
  function httpSwitch() {
    var R = "";
    switch(oReq.url.substr(0, 4)) {
      case '/mkd':  // mkdir
        Mkd(decodeURIComponent(oReq.url.substr(5)), oPar, oRes, sBody);
        return;
      case '/rmd':  // rmdir
        Rmd(decodeURIComponent(oReq.url.substr(5)), oPar, oRes, sBody);
        return;
      case "/dir":
        Dir(oReq, oPar, oRes);
        return;
      case '/unl':  // unlink
        Unl(decodeURIComponent(oReq.url.substr(5)), oPar, oRes, sBody);
        return;
      case '/ren':  // rename
        Ren(decodeURIComponent(oReq.url.substr(5)), oPar, oRes, sBody);
        return;
      case '/sto':
        Sto(decodeURIComponent(oReq.url.substr(5)), oPar, oRes, sBody);
        return;
      case '/upl':
        Upl(decodeURIComponent(oReq.url.substr(5)), oPar, oRes, oReq);
        return;
      case '/sql':
        if(oReq.url.length == 4)
          Sql(oUrl, oPar, oRes, oReq, sBody);
        else
          break;
        return;
      case '/eml':
        Eml(oUrl, oPar, oRes, oReq, sBody);
        break;
      case '/run':
        Run(oUrl, oPar, oRes, oReq);
        return;
    }
    httpGetDefault(oReq, oRes);
  }
  //..................................................................
  LOG && console.log((new Date()) + ' Received '+oReq.method+' request for ' + oReq.url);
  oUrl = url.parse(oReq.url, true);
  urlTyp = oReq.headers["content-type"];
  switch(oReq.method) {
    case 'POST':
       oReq.on('data', function(data) {
            sBody += data;
        }).on('end', function () {
        });
      var frm = formidable.IncomingForm();
      frm.parse(oReq, function(err, fields, files) {
        oPar = {
          oFields: fields,
          oFiles: files
        };
        extend(true, oPar,{
          oFields: url.parse(oReq.url, true).query,
          oFiles: {}
        });
        httpSwitch();
      });
      break;
    case 'GET':
      oPar = {
        oFields: oUrl.query,
        oFiles: {}
      };
      oReq.url = decodeURIComponent(oUrl.pathname);
      httpSwitch();
      break;
    default:
      httpSwitch();
      break;
  }
});
// -------------------------------------------------------------------
function httpGetDefault(oReq, oRes) {
  var fd = 0,
      sw = true;
      IX = INDEX;
      
  oReq.url = decodeURIComponent(oReq.url);
  if(oReq.url.substr(0, 9) == "/database"){
    IX = INDEX_DB;
  }

  try {
    fd = fs.openSync(IX + oReq.url, "r");
    fs.closeSync(fd);
  } catch(e) {
    sw = false;
  }
  if(sw && (
    fs.lstatSync(IX + oReq.url).isDirectory() ||
    fs.lstatSync(IX + oReq.url).isSymbolicLink()
  )) {
    if(oReq.url.substr(-1) != "/"){
      oRes.writeHead(302, {
        "Location": oReq.url + "/",
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      oRes.end();
      return;
    }
    for(var x in HTTP_DEFAULT_PAGE){
      try {
        fd = 0;
        fd = fs.openSync(INDEX + oReq.url + HTTP_DEFAULT_PAGE[x], "r");
        oReq.url += HTTP_DEFAULT_PAGE[x];
        break;
      } catch(e){
      }
      if(fd)
        fs.closeSync(fd);
      oRes.writeHead(404, {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      });
      oRes.end(util.format(HTML, oReq.url + " not found.."));
      return;
    }
  }

  if (!fs.existsSync(IX + oReq.url)) {
    oRes.writeHead(404, {
      "Content-Type": "text/html",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    oRes.end(util.format(HTML, oReq.url + " not found.."));
    return;
  }
  
  var F = fs.createReadStream(IX + oReq.url);
  F.on("error", function(err){
    if (!fs.lstatSync(IX + oReq.url).isDirectory()) {
      fs.readdir(IX + oReq.url, function(err, D){
        if(err) {
          oRes.writeHead(404, {
            "Content-Type": "text/html",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          });
          oRes.end(util.format(HTML, oReq.url + " not found.."));
          return;
        }
        D.sort(stringComparison);

        for(var i in REJECT){
          if(oReq.url.match(REJECT[i])){
  //          console.log(i, REJECT[i], oReq.url);
            oRes.writeHead(404, {
              "Content-Type": "text/html",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
              "Expires": "0"
            });
            oRes.end(util.format(HTML, oReq.url + " not found.."));
            return;
          }
        }
  //      console.log(oReq.url,"\n");

        oRes.writeHead(200, {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        });
        var body = '';
        for(var d in D)
          body += util.format(
            '<a href="%s/%s">%s</a><br/>',
            oReq.url.replace(/\/$/, ''),
            D[d],
            D[d]);
        oRes.end(util.format(HTML, body));
      });
    }
  });
  F.on("open", function(){
    oRes.writeHead(200, {
      "Content-Type": mime.lookup(IX + oReq.url),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    F.pipe(oRes);
  });
}
// -------------------------------------------------------------------
server.listen(PORT, function() {
  console.log((new Date()) + ' Server is listening on port ' + PORT);
});
// -------------------------------------------------------------------
function Mkd(sDir, oPar, oRes, sBody){
  LOG && console.log("mkd", sDir);
  oRes.writeHead(200, {
    "Content-Type": "octet/stream"
  });
  fs.mkdir(sDir, function(){
    oRes.end(JSON.stringify({"msg":"OK"}));
  });
}
// -------------------------------------------------------------------
function Rmd(sDir, oPar, oRes, sBody){
  LOG && console.log("rmd", sDir);
  oRes.writeHead(200, {
    "Content-Type": "octet/stream"
  });
  fs.rmdir(sDir, function(){
    oRes.end(JSON.stringify({"msg":"OK"}));
  });
}
// -------------------------------------------------------------------
function Unl(sFile, oPar, oRes, sBody){
  LOG && console.log("unl", sFile,  oPar);
  oRes.writeHead(200, {
    "Content-Type": "octet/stream"
  });
  fs.unlink(sFile, function(){
    oRes.end(JSON.stringify({"msg":"OK"}));
  });
}
// -------------------------------------------------------------------
function Ren(sFile, oPar, oRes, sBody){
  LOG && console.log("ren", sFile,  oPar);
  oRes.writeHead(200, {
    "Content-Type": "octet/stream"
  });
  fs.rename(oPar.oFields.oldFile, oPar.oFields.newFile, function(){
//console.log(oPar.oFields);
    oRes.end(JSON.stringify(oPar.oFields));
  });
}
// -------------------------------------------------------------------
function Sto(sFile, oPar, oRes, sBody) {
  var S = fs.createWriteStream(INDEX + sFile);

  if(Object.keys(oPar.oFields).length &&
     typeof oPar.oFields.encode != "undefined"
  ){
    var buf = new Buffer(oPar.oFields.data, oPar.oFields.encode)
    S.write(buf);
  } else
    S.write(sBody);
  S.end();
  oRes.writeHead(200, {
    "Content-Type": "octet/stream"
  });
  oRes.end(JSON.stringify({"msg":"OK"}));
}
// -------------------------------------------------------------------
function Upl(sFile, oPar, oRes, oReq){
  try{
    var S = fs.createReadStream(oPar.oFiles[0].path),
        D = fs.createWriteStream(oPar.oFields.filename);
    S.pipe(D, { end: false });
    S.on("end", function(){fs.unlinkSync(oPar.oFiles[0].path);})
  } catch (err) {
    console.log(err);
  }
  oRes.writeHead(200, {
    "Content-Type": "octet/stream"
  });
  oRes.end(JSON.stringify({"msg":"OK"}));
}
// ---------------------------------------------------------------------
function Dir(oReq, oPar, oRes){
  oRes.writeHead(200, {
    "Content-Type": "octet/stream"
  });
  oRes.writeHead(200, {
    "Content-Type": "octet/stream"
  });
  fs.readdir(INDEX + oPar.oFields.path, function(err, items) {
    if(err){
      console.log("ERR DIR", err);
      oRes.end();
      return;
    }
    oRes.end(items.join("\n"));
  });
}
// -------------------------------------------------------------------
function Run(oUrl, oPar, oRes){
  var sRet = "",
      sErr = "",
      Exec = null;
  function Run_end(){
    oRes.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    oRes.end(sRet + sErr);
  }
  Exec = exec(oPar.oFields.run);
  Exec.stdout.on('data', function(data) {
    sRet += data;
    Run_end();
  });
  Exec.stderr.on('data', function(data) {
    sErr += data;
  });
  Exec.on('close', function(code) {
    if(code)
      console.log(sErr + 'child process exited with code ' + code);
    Run_end();
  });
}
// -------------------------------------------------------------------
function Sql(oUrl, oPar, oRes, oReq, sBody){
  LOG && console.log("sql", oPar);
  // ...................................................................
  function ON_Error(err){
    console.log("SQL", err.message);
    oRes.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    oRes.end(JSON.stringify({err:err.message}));
    return false;
  }
  // ...................................................................
  var P = oPar.oFields;

  if(typeof P.base == "undefined")
    return ON_Error({message: "'base' not defined"});
  // ...................................................................
  if(typeof P.cmd == "undefined")
    return ON_Error({message: "'cmd' not defined"});
  P.cmd = JSON.parse(P.cmd);
//console.log("sql", P);
  // ...................................................................
  var oSQL = new sqlite3.Database(P.base);

  oSQL.run("PRAGMA busy_timeout = 4000");

  oSQL.on("error", ON_Error);
  if(fs.existsSync(REGEXP))
    oSQL.loadExtension(REGEXP);
  // ...................................................................
  var R = {};
  function exec(iA){
    if(iA >= P.cmd.length)
      return end();
    var para = P.cmd[iA].para;
    // .................................................................
    if(P.cmd[iA].sgn == "ID2IX"){
      var cmd = P.cmd[iA];
      F0();
      // Filter Records ................................................
      function F0(){
        var SQL =
          "SELECT COUNT(*) AS Filter FROM "+cmd.table+" "+cmd.WHERE;
        oSQL.all(SQL, function(err, raw){
          if(err)
            return ON_Error(err);
//console.log("F0", raw);
          if(raw[0].Filter == 0){
            R[cmd.sgn] = {
              rowIx:  0,
              recId:  "",
              Filter: 0
            }
            exec(iA + 1);
            return;
          }
          R[cmd.sgn] = {
            Filter: raw[0].Filter
          };
          F1();
        });
      }
      // check id ......................................................
      function F1(){
        if(typeof cmd.ID == "undefined" ||
           cmd.ID === null
        ){
          R[cmd.sgn].rowIx = 0;
          R[cmd.sgn].recId = "";
          exec(iA + 1);
          return;
        }
        var SQL =
          "SELECT COUNT(*) AS Test FROM "+cmd.table+" "+cmd.WHERE+" AND "+cmd.ID+"='"+cmd.recId+"'";
        oSQL.all(SQL, function(err, raw){
          if(err)
            return ON_Error(err);
//console.log("F1", raw);
          if(raw[0].Test == 0){
            R[cmd.sgn].rowIx = 0;
            F4();
            return;
          }
          F2();
        });
      }
      // sortValue .....................................................
      function F2(){
        var SQL =
          "SELECT "+cmd.orderBy+" AS V"+
            " FROM "+cmd.table+
            " WHERE "+cmd.ID+"='"+cmd.recId+"'"+
            " LIMIT 1";
        oSQL.all(SQL, function(err, raw){
          if(err)
            return ON_Error(err);
          if(raw.length == 0 ||  raw[0].V  === null)
            var sortValue = null;
          else if(typeof raw[0].V == "number")
            var sortValue = raw[0].V;
          else
            var sortValue = "'"+raw[0].V+"'";
          if(sortValue === null){
            if(cmd.orderType == "ASC")
              W = util.format(
                "(%s < NULL) OR ((%s IS NULL) AND %s <= '%s')",
                cmd.orderBy,
                cmd.orderBy,
                cmd.ID,
                cmd.recId
              );
            else
              W = util.format(
                "(%s IS NOT NULL) OR ((%s IS NULL) AND %s >= '%s')",
                cmd.orderBy,
                cmd.orderBy,
                cmd.ID,
                cmd.recId
              );
          } else {
            if(cmd.orderType == "ASC")
              W = util.format(
                "(%s < %s OR %s IS NULL) OR (%s = %s AND %s <= '%s')",
                cmd.orderBy,
                sortValue,//Para.rec_val_ord,
                cmd.orderBy,
                cmd.orderBy,
                sortValue,//Para.rec_val_ord,
                cmd.ID,
                cmd.recId
              );
            else
              W = util.format(
                "(%s > %s AND %s IS NOT NULL) OR (%s = %s AND %s >= '%s')",
                cmd.orderBy,
                sortValue,//Para.rec_val_ord,
                cmd.orderBy,
                cmd.orderBy,
                sortValue,//Para.rec_val_ord,
                cmd.ID,
                cmd.recId
              );
          }
          R[cmd.sgn].sortValue = sortValue;
          F3();
        });
      }
      // rowIx .........................................................
      function F3(){
        var SQL =
          "SELECT COUNT(*) - 1 as N FROM "+cmd.table +
          " "+cmd.WHERE+" AND ("+W+")";
        oSQL.all(SQL, function(err, raw){
          if(err)
            return ON_Error(err);
//console.log("F3", raw);
          if(raw.length && raw[0].N >= 0){
            R[cmd.sgn].rowIx = raw[0].N;
            R[cmd.sgn].recId = cmd.recId;
            exec(iA + 1);
          } else {
            R[cmd.sgn].rowIx = 0;
            F4();
          }
        });
      }
      // recId .........................................................
      function F4(){
        var SQL =
          "SELECT "+cmd.ID+" AS RecId FROM "+cmd.table +
          " "+cmd.WHERE+
          " ORDER BY "+cmd.orderBy+" "+cmd.orderType+","+cmd.ID+" "+cmd.orderType+
          " LIMIT "+R[cmd.sgn].rowIx+",1";
        oSQL.all(SQL, function(err, raw){
          if(err)
            return ON_Error(err);
//console.log("F4", raw);
          R[cmd.sgn].recId = raw[0].RecId;
          exec(iA + 1);
        });
      }
    // .................................................................
    } else if(P.cmd[iA].query == "JSON"){
      var SQL =
        "SELECT "+P.cmd[iA].col+" FROM "+P.cmd[iA].table+
        " WHERE id=?";
      oSQL.all(SQL, P.cmd[iA].para, function(err, raw){
        if(err)
          return ON_Error(err);
        var val_org;
        if(raw.length == 0 || raw[0][P.cmd[iA].col] == "")
          val_org = {};
        else
          val_org = JSON.parse(raw[0][P.cmd[iA].col]);
        if(val_org == null)
          val_org = {};
        extend(true, val_org, P.cmd[iA].val);
        val_org = JSON.stringify(val_org);
//console.log("\nval", JSON.stringify(P.cmd[iA].val), "\norg", val_org);
        SQL =
          "UPDATE "+P.cmd[iA].table+
          " SET "+P.cmd[iA].col+"=?"+
          " WHERE id=?";
        oSQL.run(SQL, [val_org, para[0]], function(err, raw){
          if(err)
            return ON_Error(err);
          R[P.cmd[iA].sgn ? P.cmd[iA].sgn : iA] = {
            lastID: this.lastID,
            changes: this.changes
          };
          exec(iA + 1);
        });
      });
    // .................................................................
    } else if(P.cmd[iA].query.match(/^INSERT|^DELETE|^UPDATE/i)){
      oSQL.run(P.cmd[iA].query, para, function(err, raw){
        if(err)
          return ON_Error(err);
        R[P.cmd[iA].sgn ? P.cmd[iA].sgn : iA] = {
          lastID: this.lastID,
          changes: this.changes
        };
        exec(iA + 1);
      });
    // .................................................................
    } else {
      oSQL.all(P.cmd[iA].query, para, function(err, raw){
        if(err)
          return ON_Error(err);
        R[P.cmd[iA].sgn ? P.cmd[iA].sgn : iA] = raw;
        exec(iA + 1);
      });
    }
  }
  // ...................................................................
  function end(){
    oRes.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    oRes.end(JSON.stringify(R));
  }
  // ...................................................................
  exec(0);
}
// -------------------------------------------------------------------
function Eml(oUrl, oPar, oRes, oReq, sBody){
  //console.log("eml", oPar);
  oRes.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  var server  = email.server.connect({
      user:    "michael.krocka@gmail.com",
      password:"MiKroITSD!",
      host:    "smtp.gmail.com",
      ssl:     true
  });
  var oSend = {
    text:    oPar.oFields.text,
    from:    "Michael Krocka<michael.krocka@gmail.com>",
    to:      oPar.oFields.to,
    cc:      oPar.oFields.cc,
    subject: oPar.oFields.subject
  };
  if(typeof oPar.oFields.attachmnet != "undefined" &&
     oPar.oFields.attachmnet != ""
  ){
    oSend["attachment"] = [{
      data: oPar.oFields.attachmnet,
      alternative:true
    }];
  }
  server.send(oSend, function(err, message) {
    if(err == null)
      oRes.end(JSON.stringify({state:"OK"}));
    else
      oRes.end(JSON.stringify({state:err.message}));
  });
}
// -------------------------------------------------------------------
function stringComparison(a, b) {
  a = a.toLowerCase();
  a = a.replace(/ä/g,"a");
  a = a.replace(/ö/g,"o");
  a = a.replace(/ü/g,"u");
  a = a.replace(/ß/g,"s");

  b = b.toLowerCase();
  b = b.replace(/ä/g,"a");
  b = b.replace(/ö/g,"o");
  b = b.replace(/ü/g,"u");
  b = b.replace(/ß/g,"s");

  return(a==b)?0:(a>b)?1:-1;
}
// -------------------------------------------------------------------
