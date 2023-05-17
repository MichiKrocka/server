#!/usr/bin/php
<?php
  use PHPMailer\PHPMailer\PHPMailer;
  use PHPMailer\PHPMailer\Exception;
  require '/usr/share/php/libphp-phpmailer/autoload.php';
  //####################################################################
  $PDO = new PDO(
    "mysql:host=localhost;dbname=bermuda;charset=utf8",
    "krocka",
    "miso62krocka"
  );
  $PDO->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
  $PDO->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
  $mail = new PHPMailer(true);
  //####################################################################
  // project
  $SQL  = "SELECT id,project FROM project WHERE state='X'";
  $PARA = array();
  $ST   = $PDO->prepare($SQL);
  if($ST && $ST->execute($PARA)){
    $PRJ = $ST->fetchAll();
  } else {
    echo "ERR ".__LINE__.var_export($PDO->errorInfo())."\n";
    exit;
  }

  //####################################################################
  foreach($PRJ as $prj){
    //echo var_export($prj)."\n";
    $PRJ_DB = sprintf("bermuda_%05d", $prj["id"]);
    // -----------------------------------------------------------------
    // plan
    $TXT_P = array();
    switch($argv[1]){
      case "S":
        $SQL = "SELECT id,type,autor,name FROM ".$PRJ_DB.".plan WHERE ADDTIME(stmp, '0 1:0:0') > NOW() AND (stop IS NULL OR stop='') ORDER BY type,stmp";
        break;
      case "T":
        $SQL = "SELECT id,type,autor,name FROM ".$PRJ_DB.".plan WHERE ADDTIME(stmp, '1 0:0:0') > NOW() AND (stop IS NULL OR stop='') ORDER BY type,stmp";
        break;
      case "W":
        $SQL = "SELECT id,type,autor,name FROM ".$PRJ_DB.".plan WHERE ADDTIME(stmp, '7 0:0:0') > NOW() AND (stop IS NULL OR stop='') ORDER BY type,stmp";
        break;
    }
    $PARA   = array();
    $ST     = $PDO->prepare($SQL);
    if($ST && $ST->execute($PARA)){
      $PLAN = $ST->fetchAll();
    } else {
      echo "ERR ".__LINE__.var_export($PDO->errorInfo())."\n";
      exit;
    }
    foreach($PLAN as $i => $plan){
      array_push($TXT_P, sprintf(
        "%5d %3d %-5s %-30s %s",
        $i + 1, $plan["id"], $plan["type"], $plan["autor"], $plan["name"]
      ));
    }
    if(sizeof($TXT_P))
      $TXT_P = "Plan\n".join("\n", $TXT_P);
    else
      $TXT_P = "";
    // -----------------------------------------------------------------
    // doku
    $TXT_D = array();
    switch($argv[1]){
      case "S":
        $SQL = "SELECT id,type,autor,name FROM ".$PRJ_DB.".docu WHERE ADDTIME(stmp, '0 1:0:0') > NOW() AND (stop IS NULL OR stop='') ORDER BY type,stmp";
        break;
      case "T":
        $SQL = "SELECT id,type,autor,name FROM ".$PRJ_DB.".docu WHERE ADDTIME(stmp, '1 0:0:0') > NOW() AND (stop IS NULL OR stop='') ORDER BY type,stmp";
        break;
      case "W":
        $SQL = "SELECT id,type,autor,name FROM ".$PRJ_DB.".docu WHERE ADDTIME(stmp, '7 0:0:0') > NOW() AND (stop IS NULL OR stop='') ORDER BY type,stmp";
        break;
    }
    $PARA   = array();
    $ST     = $PDO->prepare($SQL);
    if($ST && $ST->execute($PARA)){
      $DOCU = $ST->fetchAll();
    } else {
      echo "ERR ".__LINE__.var_export($PDO->errorInfo())."\n";
      exit;
    }
    foreach($DOCU as $i => $docu){
      array_push($TXT_D, sprintf(
        "%5d %3d %-5s %-30s %s",
        $i + 1, $docu["id"], $docu["type"], $docu["autor"], $docu["name"]
      ));
    }
    if(sizeof($TXT_D))
      $TXT_D = "Dokumentation\n".join("\n", $TXT_D);
    else
      $TXT_D = "";
    // -----------------------------------------------------------------
    if($TXT_D == "" && $TXT_P == "")
      continue;
    if($TXT_D != "" && $TXT_P != "")
      $TXT_P .= "\n\n";
    // -----------------------------------------------------------------
    // dbuser
    $SQL    = "SELECT dbuser FROM ".$PRJ_DB.".sys_user WHERE advice=?";
    $PARA   = array($argv[1]);
    $ST     = $PDO->prepare($SQL);
    if($ST && $ST->execute($PARA)){
      $DBUSER = $ST->fetchAll();
    } else {
      echo "ERR ".__LINE__.var_export($PDO->errorInfo())."\n";
      exit;
    }
    // -----------------------------------------------------------------
    // mail
    if(sizeof($DBUSER) == 0)
      continue;

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
      foreach($DBUSER as $dbuser){
        $mail->addAddress($dbuser["dbuser"]);
      }
      $mail->addBCC('michael.krocka@gmail.com');

      $mail->Subject = "BERMUDA ".$prj["project"]." (${argv[1]}) - neue oder geänderte Daten";
      $mail->Body    = $TXT_P.$TXT_D;

      $mail->send();
    } catch (Exception $e) {
      echo json_encode($mail->ErrorInfo);
    }

/*
    $mail = new PHPMailer;
    //$mail->SMTPDebug = 3;                           // Enable verbose debug output
    $mail->isSMTP();                                // Set mailer to use SMTP
    $mail->Host       = 'mail.itsd.de';             // Specify main and backup SMTP servers
    $mail->SMTPAuth   = true;                       // Enable SMTP authentication
    $mail->Username   = 'krocka';                   // SMTP username
    $mail->Password   = 'misokrocka';               // SMTP password
    $mail->SMTPSecure = 'tls';                      // Enable TLS encryption, `ssl` also accepted
    $mail->Port       = 587;                        // TCP port to connect to
    $mail->SMTPOptions = array(                     // Certificate
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        )
    );
    $mail->CharSet = 'utf-8';
    ini_set('default_charset', 'UTF-8');
    $mail->setFrom('bermuda@itsd.de', 'BERMUDA');
//    $mail->setFrom('michael.krocka@itsd.de', 'BERMUDA');
    foreach($DBUSER as $dbuser){
      $mail->addAddress($dbuser["dbuser"]);
    }
    $mail->Subject = "BERMUDA ".$prj["project"]." (${argv[1]}) - neue oder geänderte Daten";
    $mail->Body    = $TXT_P.$TXT_D;
    if(!$mail->send()) {
  //file_put_contents("/tmp/sql", var_export($mail->ErrorInfo, true).PHP_EOL, FILE_APPEND);
      echo $mail->ErrorInfo;
    }
    */
  }
//file_put_contents("/tmp/sql", "11".PHP_EOL, FILE_APPEND);
//file_put_contents("/tmp/sql", var_export($argv, true).PHP_EOL, FILE_APPEND);
  //####################################################################
?>
