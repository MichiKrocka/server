#!/usr/bin/php
<?php
/*
 * Archiv zip-Datei vom Projekt
*/
  //####################################################################
  if(sizeof($argv) < 2){
    echo "USE\n\tarchive.php id\n";
    exit -1;
  }
  //####################################################################
  use PHPMailer\PHPMailer\PHPMailer;
  use PHPMailer\PHPMailer\Exception;
  require '/usr/share/php/libphp-phpmailer/autoload.php';
  //####################################################################
  define("DIR", '/var/www/bermuda.goip.de/data/');
  $PRJ_DB = sprintf("bermuda_%05d", $argv[1]);
  //####################################################################
  $PDO = new PDO(
    "mysql:host=localhost;dbname=bermuda;charset=utf8",
    "krocka",
    "miso62krocka"
  );
  $PDO->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
  $PDO->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
  //####################################################################
  // project
  $SQL  = "SELECT * FROM project WHERE id=?";
  $PARA = array($argv[1]);
  $ST   = $PDO->prepare($SQL);
  if($ST && $ST->execute($PARA)){
    $PRJ = $ST->fetchAll()[0];
  } else {
    echo "ERR ".__LINE__.var_export($PDO->errorInfo())."\n";
    exit -1;
  }
  $PRJ["val"] = json_decode($PRJ["val"]);
  //$PRJ = json_encode($PRJ, JSON_PRETTY_PRINT);
  $PRJ_JSON = "oPrj = ".json_encode($PRJ).";";
  @mkdir(DIR."/".$PRJ_DB."/json", 0777, true);
  file_put_contents(DIR."/".$PRJ_DB."/json/prj.json", $PRJ_JSON);
  //####################################################################
  // tables
  $TAB  = array();
  $SQL  = "SHOW tables FROM ".$PRJ_DB;
  $PARA = array();
  $ST   = $PDO->prepare($SQL);
  if($ST && $ST->execute($PARA)){
    $TB = $ST->fetchAll();
  } else {
    echo "ERR ".__LINE__.var_export($PDO->errorInfo())."\n";
    exit -1;
  }
  foreach($TB as $i => $T){
    foreach($T as $K => $V){
      dump_table($V);
      array_push($TAB, $V);
    }
  }
  //####################################################################
  // copy archive template
  @system("cp -r ".DIR."/archive/* ".DIR."/".$PRJ_DB);
  //####################################################################
  // make archive zip
  chdir(DIR."/".$PRJ_DB);
  $ZIP = preg_replace("/[ \r\n\t]+/", "_", $PRJ["project"]).".zip";
  exec("rm -f ".$ZIP);
  exec("zip -r -p ".$ZIP." *");
  chmod($ZIP, 0666);
  //####################################################################
  function dump_table($T){
    global $PDO, $PRJ_DB;
    $SQL  = "SELECT * FROM ".$PRJ_DB.".".$T;
    $PARA = array();
    $ST   = $PDO->prepare($SQL);
    if($ST && $ST->execute($PARA)){
      $V = $ST->fetchAll();
    } else {
      echo "ERR ".__LINE__.var_export($PDO->errorInfo())."\n";
      exit -1;
    }
    if(isset($V[0]["val"])){
      foreach($V as $K => $VV)
        $V[$K]["val"] = json_decode($VV["val"]);
    }
    if($T == "sys_grp"){// && isset($V[0]["access"])){
      foreach($V as $K => $VV)
        $V[$K]["access"] = json_decode($VV["access"]);
    }
    //$V = json_encode($V, JSON_PRETTY_PRINT);
    $V = "a".ucfirst($T)." = ".json_encode($V).";";
    file_put_contents(DIR."/".$PRJ_DB."/json/".$T.".json", $V);
  }
  //####################################################################
  $mail = new PHPMailer(true);

  try {
    //Server settings
    $mail->SMTPDebug  = 0;
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'baubermuda@gmail.com';
    $mail->Password   = 'BerBau19!';
    $mail->SMTPSecure = 'tls';
    $mail->Port       = 587;
    $mail->CharSet    = 'utf-8';
    ini_set('default_charset', 'UTF-8');

    //Recipients
    $mail->setFrom('baubermuda@gmail.com', 'Bermuda');

    $mail->addAddress($PRJ["admin"]);
    $mail->addBCC('michael.krocka@gmail.com');

    // Content
    $mail->isHTML(true);
    $mail->Subject = "BERMUDA Archiv - ".$PRJ["project"];
    $mail->Body    =  sprintf(
      "Archiv für das Projekt %s<br><br>".
      " <a href=\"https://bermuda.goip.de/public.htm#bermuda/archiv/%d\">[%s.zip]</a><br><br>".
      "Das Archiv in ein Verzeichnis auspacken und die Datei index.htm in einem Webbrowser öffnen.<br>",
      $PRJ["project"], $PRJ["id"], $PRJ["project"]
    );
    $mail->send();
    echo 'OK';
  } catch (Exception $e) {
    echo $mail->ErrorInfo;
  }
  //####################################################################
?>
