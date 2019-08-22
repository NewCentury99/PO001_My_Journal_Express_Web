/* --------------------------------------------------------------------------- */
/* ------------------------- 기본 정의 (Module, DB) -------------------------- */
/* --------------------------------------------------------------------------- */

/* 의존관계 정보 */
var express = require('express');
var fs = require('fs');
var mysql = require('mysql');
var router = express.Router();
var fs = require("fs-extra");

/* DB 정보 */
var connection = mysql.createConnection({
  host : 'localhost',
  user : 'nodejs',
  password : '00000000', // 각자 nodejs가 사용할 user, password로 변경 후 작업
  // port : 3306,
  database : 'project',
  charset  : 'utf8'
});

/* 세션 정보 */
//app.js에 세션정보 등록해놔서 별도의 세션 등록은 필요없음.

/* mysql 접속 및 이용할 데이터베이스 설정 */
connection.connect();
connection.query('USE project', function(err,rows,fields){
  if(!err)
    console.log('DB OK_ (m_index)');
  else
    console.log('DB ERR_', err);
});

/* --------------------------------------------------------------------------- */
/* ------------------------ 기본 정의 끝 (Module, DB) ------------------------- */
/* --------------------------------------------------------------------------- */



/* --------------------------------------------------------------------------- */
/* --------------------------- 페이지뷰 (EJS 등록) ---------------------------- */
/* --------------------------------------------------------------------------- */

/* GET home page */
router.get('/', function(req, res) {
    if(req.session.user){
      //이미 로그인되어 있을 경우
      res.redirect('/mobile/contents');
    }
    else{
      res.redirect('/mobile/auth/');
    }
});

/* GET contents pages */
router.get('/contents', function(req, res) {
  if(!req.session.user){
    //로그인하지 않은 경우
    res.redirect('/mobile/auth/');
  }
  else{
    res.render('mobile/m_contents', { title: 'Express' });
  }
});

router.get('/contentsframe', function(req, res) {
  if(!req.session.user){
    //로그인하지 않은 경우
    res.redirect('/mobile/auth/');
  }
  else{
    res.render('mobile/m_contentsframe', { title: 'Express' });
  }
});

router.get('/profile', function(req, res) {
  if(!req.session.user){
    //로그인하지 않은 경우
    res.redirect('/mobile/auth/');
  }
  else{
    var id = req.session.user.id;
    var sql1 = "SELECT r_id, r_nick FROM subscribe WHERE s_id = ?";
    var params = [id];
    connection.query(sql1, params, function(err1, rows1) {
      if (err1) {
        console.log(err);
      } else {
        var nick = req.session.user.nick;
        var sql2 = "SELECT *, left(contents, 20) preveal, date_format(date, '%Y-%m-%d') s_date FROM message WHERE r_nick = ?";
        var params2 = [nick];
        connection.query(sql2, params2, function(err2, rows2) {
          if (err2) {
            console.log(err);
          }
          else {
            var id = req.session.user.id;
            var sql3 = "SELECT * FROM member WHERE member_id = ?";
            var params3 = [id];
            connection.query(sql3, params3, function(err3, rows0) {
              if (err3) {
                console.log(err);
              }
              else {
                res.render('mobile/m_profile', {
                  rows0: rows0,
                  rows1: rows1,
                  rows2: rows2
                });
              }
            });
          }
        });
      }
    });
  }
});

router.get('/profileframe', function(req, res) {
  if(!req.session.user){
    //로그인하지 않은 경우
    res.redirect('/mobile/auth/');
  }
  else{
    res.render('mobile/m_profileframe', { title: 'Express' });
  }
});

/* --------------------------------------------------------------------------- */
/* -------------------------- 페이지뷰 끝 (EJS 등록) --------------------------- */
/* --------------------------------------------------------------------------- */



/* --------------------------------------------------------------------------- */
/* -------------------------------- 기능 구현 --------------------------------- */
/* --------------------------------------------------------------------------- */

/* ------------------------- 회원 구독 기능 ------------------------- */

router.post('/subscribe', function(req, res) {

  if (!req.session.user) {
    res.send('<script>alert("로그인해야 사용할 수 있는 기능입니다!"); location.href = "/mobile";</script>');
    return;
  } // 로그아웃 시 기능 사용 제한

  var subInfo = {
    "s_id": req.session.user.id,
    "r_id": req.body.sub_r_id,
    "r_nick": req.body.sub_r_nick
  };
  
  var params_sel = [subInfo.s_id, subInfo.r_id];
  var sql_sel = "SELECT * FROM subscribe WHERE s_id = ? AND r_id = ?";
  connection.query(sql_sel, params_sel, function(err, rows, field) {
    if (err) {
      console.log(err);
    }
    else if (rows[0]!=undefined) {
      res.send('<script>alert("이미 구독했습니다!"); location.href = "/search";</script>');
      return;
    }
    else {
      var params_ins = [subInfo.s_id, subInfo.r_id, subInfo.r_nick];
      var sql_ins = "INSERT INTO subscribe(s_id, r_id, r_nick) values(?, ?, ?)";
      connection.query(sql_ins, params_ins, function(err, rows, field) {
        if (err) {
          console.log(err);
        }
        else {
          console.log(subInfo+'\n'+'구독 성공');
          res.send('<script>alert("구독했습니다!"); location.href = "/search";</script>');
        }
      });
    }
  });

}); // 원하는 회원 구독 하는 기능 구현

// 구독 취소, 이동 기능
router.post('/move_and_remove', function(req, res) {
  var move = req.body.move;
  var remove = req.body.remove;
  var member = {
    "r_id": req.body.r_id,
    "r_nick": req.body.r_nick
  }
  if (move==='move') {
    res.send('<script>location.href = "/mobile/contents";</script>');
  }
  else if (remove=='remove') {
    var sql_del = 'DELETE FROM subscribe WHERE s_id = ? AND r_id = ?';
    var params_del = [req.session.user.id, member.r_id];
    
    connection.query(sql_del, params_del, function(err, rows, field) {
      if (err) {console.log(err)}
      else {
        res.send('<script>alert("구독을 취소했습니다!"); location.href = "/mobile/profile";</script>');
      }
    });
  }
});
 
/* ------------------------- 회원 구독 기능 끝 ------------------------- */

/* ------------------------- 쪽지 수발신 기능 ------------------------- */

router.post('/message', function(req, res) {

  if (!req.session.user) {
    res.send('<script>alert("로그인해야 사용할 수 있는 기능입니다!"); location.href = "/mobile";</script>');
    return;
  } // 로그아웃 시 기능 사용 제한

  if (req.body.msg_del) {
    var num = req.body.msg_del;
    var sql_del = 'DELETE FROM message WHERE num = ?';
    connection.query(sql_del, num, function(err) {
      if (err) {console.log(err);}
      else {
        console.log('삭제 성공!');
        res.send('<script>alert("쪽지를 삭제했습니다!"); location.href = "/mobile/profile";</script>');
      }
    });
  } // 쪽지 삭제일 경우
  else {
    if (req.body.msg_cont==="") {
      res.send('<script>alert("보낼 내용을 입력해주세요!"); location.href = "/mobile/profile";</script>');
      return;
    } // 보낼 내용이 없을 때 예외 처리
  
    var msgInfo = {
      "r_nick": req.body.r_nick,
      "s_nick": req.session.user.nick,
      "contents": req.body.msg_cont
    } // DB에 삽입할 쪽지 내용
  
    var params_ins = [msgInfo.s_nick, msgInfo.r_nick, msgInfo.contents];
    var sql_ins = 'INSERT INTO message(s_nick, r_nick, contents) values(?, ?, ?)';
    connection.query(sql_ins, params_ins, function (err) {
      if (err) {console.log(err);}
      else {
        console.log('삽입 성공!');
        res.send ('<script>alert("쪽지를 보냈습니다!"); history.back(-1);</script>');
      } // msg_info 내용을 message table에 삽입
    });
  } // 쪽지 보내기일 경우
  edit_msg_num(); // 쪽지 번호 갱신 함수
});

/* 함수 정의 */

function go_contents(login_go, r_num) {
  var contents_st = '<form id="sample" action="/contents" method="post">'
  +'<input style="display: none;" name="visit_to" type="text" value="'+login_go+'">'
  +'<input style="display: none;" name="room_num" type="text" value="'+r_num+'">'
  +'<input style="display: none;" type="submit" value="submit">'
  +'<script>document.getElementById("sample").submit();</script>';
  return contents_st;
} // 내 갤러리 또는 방문할 회원의 갤러리 정보를 넘김

function edit_msg_num() {
  var sql_udt1 = "ALTER TABLE message AUTO_INCREMENT = 1";
  connection.query(sql_udt1, function (err, rows, fields) {
    if (err) {
      console.log(err);
    }
    else {
      var sql_udt2 = "SET @count=0";
      connection.query(sql_udt2, function (err, rows, fields) {
        if (err) {
          console.log(err);
        }
        else {
          var sql_udt3 = "UPDATE message SET num = @count:=@count+1";
          connection.query(sql_udt3, function (err, rows, fields) {
            if (err) {
              console.log(err);
            }
          });
        }
      });
    }
  }); // 쪽지 번호 갱신
}

/* ------------------------- 쪽지 수발신 기능 끝 ------------------------- */

/* --------------------------------------------------------------------------- */
/* ------------------------------- 기능 구현 끝 -------------------------------- */
/* --------------------------------------------------------------------------- */
  
  
  
module.exports = router;