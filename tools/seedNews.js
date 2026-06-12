#!/usr/bin/env node
/**
 * seedNews.js — one-off: clear the `news` collection and seed 6 mock articles.
 *
 * The articles reference real seeded season data (teams, final scores,
 * standings) so the content is coherent with the rest of the site.
 *
 *   node tools/seedNews.js   # runs immediately (deletes existing news!)
 */

const path = require("path");
const crypto = require("crypto");
const admin = require("firebase-admin");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});
const db = admin.firestore();

const newsId = () => "news-" + crypto.randomBytes(4).toString("hex");

async function main() {
  // ---- teams: resolve by school number/keyword for ids + logos ----
  const teamsSnap = await db.collection("teams").get();
  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const bySchool = (key) => {
    const k = String(key).toLowerCase();
    const t = teams.find((t) => {
      const s = String(t.school || "").toLowerCase();
      const num = s.match(/^(\d+)/);
      return num ? num[1] === k : s.includes(k);
    });
    if (!t) throw new Error(`team not found for "${key}"`);
    return t;
  };

  const EE = bySchool("эрхэт"); // Эрхэт Эрдэм Emura, 13-1
  const T33 = bySchool("33"); // 33 Sparks, 10-1
  const T117 = bySchool("117"); // 117 Thunder, 8-2
  const UNUR = bySchool("өнөр"); // Өнөр TST, 7-3
  const T31 = bySchool("31"); // 31 Devils
  const T16 = bySchool("16"); // 16 Storm
  const T3 = bySchool("3"); // 3 Алтан Од
  const T151 = bySchool("151"); // 151 Royal Dunk

  // ---- delete existing news ----
  const existing = await db.collection("news").get();
  console.log(`Deleting ${existing.size} existing news docs:`);
  existing.forEach((d) => console.log(`  - ${d.id} "${d.data().title}"`));
  const delBatch = db.batch();
  existing.forEach((d) => delBatch.delete(d.ref));
  await delBatch.commit();

  // ---- 6 articles ----
  const articles = [
    {
      status: "published",
      title: "Ширүүн тулаан: 117 Thunder 31-р сургуулийг 33:31-ээр дийлэв",
      summary:
        "Зүүн бүсийн хоёр хүчирхэг баг эцсийн секунд хүртэл тэмцэлдсэн тоглолтод 117 Thunder хоёрхон онооны зөрүүгээр ялж, бүсээ тэргүүлсээр байна.",
      contentHtml:
        "<p>Зургадугаар сарын 8-нд болсон улирлын хамгийн ширүүн тулаануудын нэгэнд 117 Thunder баг 31-р сургуулийн Devils багийг 33:31-ээр буулгаж авлаа.</p><p>Эхний хагаст хоёр баг ээлжлэн тэргүүлж, аль аль нь хамгаалалтад онцгой тоглосон бол сүүлийн үед Thunder багийн туршлага илүүрхэв. Devils багийн хувьд эцсийн довтолгоо нь үр дүнгүй өндөрлөж, хожигдол хүлээсэн ч плей-оффын төлөөх боломжоо хадгалсаар байна.</p><p>Энэ ялалтаар 117 Thunder 8 хожил, 2 хожигдолтойгоор Зүүн бүсээ тэргүүлж байна. Devils 7-4 амжилттай явж байгаа бөгөөд хоёр баг плей-оффт дахин тулгарах магадлал өндөр байна.</p>",
      coverImage: T117.logo || "",
      category: "recap",
      teamIds: [T117.id, T31.id],
      author: "СГЛ Медиа",
      date: "2026-06-08",
      featured: true,
    },
    {
      status: "published",
      title: "Эрхэт Эрдэм Emura 13 дахь ялалтаа авч, лигээ тэргүүлсээр",
      summary:
        "Улирлын хамгийн өндөр амжилттай яваа Эрхэт Эрдэм Emura баг 16 Storm багийг 43:27-оор хожиж, дараалсан 5 дахь ялалтаа байгууллаа.",
      contentHtml:
        "<p>Зургадугаар сарын 5-нд Эрхэт Эрдэм Emura баг 16 Storm багтай тулж 43:27-оор ялалт байгуулав. Ингэснээр тус баг 13 хожил, ганцхан хожигдолтойгоор лигийн хамгийн өндөр амжилтыг үзүүлж байна.</p><p>Emura багийн хамгаалалт энэ удаад ч мөн л найдвартай ажиллаж, өрсөлдөгчдөө дөнгөж 27 оноо авахыг зөвшөөрлөө. Улирлын туршид тус баг өрсөлдөгчдөөсөө дунджаар 20 гаруй оноогоор илүүрхэж байгаа нь анхаарал татаж байна.</p><p>Багийн цорын ганц хожигдол нь гуравдугаар сарын 25-нд 33 Sparks багт ганц онооны зөрүүгээр (44:45) хүлээсэн хожигдол бөгөөд энэ хоёр багийн дараагийн тулаан плей-оффын хамгийн том сонирхол байх нь дамжиггүй.</p>",
      coverImage: EE.logo || "",
      category: "recap",
      teamIds: [EE.id, T16.id],
      author: "СГЛ Медиа",
      date: "2026-06-05",
      featured: false,
    },
    {
      status: "published",
      title: "Улирлын дээд амжилт: Эрхэт Эрдэм нэг тоглолтод 84 оноо авав",
      summary:
        "Эрхэт Эрдэм Emura баг 3-р сургуулийн Алтан Од багийн эсрэг 84:14-өөр хожиж, улирлын нэг тоглолтын онооны дээд амжилтыг тогтоолоо.",
      contentHtml:
        "<p>Тавдугаар сарын 7-нд болсон тоглолтод Эрхэт Эрдэм Emura баг 3-р сургуулийн Алтан Од багийг 84:14 гэсэн асар их зөрүүтэй буулгаж авлаа. Энэ нь 2025-2026 оны улирлын нэг багийн авсан хамгийн өндөр оноо юм.</p><p>Тоглолтын эхний минутаас л Emura багийн хурдтай довтолгоо үр дүнгээ өгч, хагас үеийн дараа тоглолтын хувь заяа бараг шийдэгдсэн байв. Багийн бүх тоглогч талбайд гарч оноо нэмсэн нь баг доторх гүн бүрэлдэхүүний давуу талыг харууллаа.</p><p>Алтан Од багийн хувьд хүнд хожигдол байсан ч залуу бүрэлдэхүүнтэй тус баг улирлын сүүлийн тоглолтуудад илт ахиц гаргаж, тавдугаар сарын 20-нд Шинэ Монголыг 52:14-өөр хожсон юм.</p>",
      coverImage: EE.logo || "",
      category: "highlight",
      teamIds: [EE.id, T3.id],
      author: "СГЛ Медиа",
      date: "2026-05-07",
      featured: false,
    },
    {
      status: "published",
      title: "Плей-оффын төлөв тодорч байна: тэргүүлэгч дөрвөн баг",
      summary:
        "Улирлын төгсгөл ойртох тусам плей-оффын байр дараалал тодорч, Эрхэт Эрдэм, 33 Sparks, 117 Thunder, Өнөр TST багууд тэргүүлж байна.",
      contentHtml:
        "<p>2025-2026 оны улирал төгсгөлдөө ойртож байгаа энэ үед бүсүүдийн байр дараалал бараг тодорхой боллоо.</p><h2>Баруун бүс</h2><p>Эрхэт Эрдэм Emura (13-1) болон 33 Sparks (10-1) хоёр баг бусдаасаа илт тасархай явна. Хоёр багийн хоорондын цорын ганц тулаан ганц онооны зөрүүтэй өндөрлөсөн нь плей-оффын финалын урьдчилсан зурвас гэж олон хүн үзэж байна. 84 Shooting Stars (9-6) гуравдугаар байрын төлөө тэмцсээр байна.</p><h2>Зүүн бүс</h2><p>117 Thunder (8-2) бүсээ тэргүүлж, Өнөр TST (7-3) болон 31-р сургуулийн Devils (7-4) багууд ойрхон бүлэглэн хөөцөлдөж байна. 1-р сургуулийн Шонхорууд болон 151 Royal Dunk багууд ч плей-оффын бүсэд багтах боломжтой хэвээр.</p><p>Эхний дөрвөн баг плей-оффт шууд шалгарах тул үлдсэн тоглолт бүр шийдвэрлэх ач холбогдолтой.</p>",
      coverImage: T33.logo || "",
      category: "announcement",
      teamIds: [EE.id, T33.id, T117.id, UNUR.id],
      author: "СГЛ Медиа",
      date: "2026-06-10",
      featured: false,
    },
    {
      status: "published",
      title: "33 Sparks: «Бид алхам алхмаар ахьсан» — ярилцлага",
      summary:
        "10 хожил, ганц хожигдолтой яваа 33 Sparks багийн тоглогчидтой улирлын амжилт, Эрхэт Эрдэмтэй хийсэн дуулиантай тулааны тухай ярилцлаа.",
      contentHtml:
        "<p>Баруун бүсэд 10 хожил, 1 хожигдолтой явж буй 33 Sparks багийн тоглогчидтой ярилцлаа.</p><p>«Улирлын эхэнд бид өөрсдийгөө ингэтлээ амжилттай явна гэж төсөөлөөгүй. Дасгалжуулагч маань хамгаалалтыг нэгдүгээрт тавьдаг, тэр зарчим маань үр дүнгээ өгч байна» гэж багийн ахмад тоглогчдын нэг М. Урангоо ярив.</p><p>Гуравдугаар сарын 25-нд Эрхэт Эрдэмд 44:45-аар хожигдсон тоглолтын тухай асуухад: «Тэр хожигдол биднийг илүү хатуужилтай болгосон. Дахин тулбал бид бэлэн» гэж хариуллаа.</p><p>Sparks баг улирлаа дараалсан 5 ялалттай үдэж байгаа бөгөөд тавдугаар сарын 24-нд 141 Bunny багийг 50:20-оор хожсон нь сүүлийн үеийн хамгийн өндөр оноотой ялалт нь болов.</p>",
      coverImage: T33.logo || "",
      category: "interview",
      teamIds: [T33.id],
      author: "СГЛ Медиа",
      date: "2026-06-02",
      featured: false,
    },
    {
      status: "published",
      title: "151 Royal Dunk сэргэлээ: дараалсан хоёр ялалт",
      summary:
        "151 Royal Dunk баг Өнөр TST-г 31:28-аар хожиж дараалсан хоёр дахь ялалтаа авлаа. Зүүн бүсийн плей-оффын төлөөх тэмцэл улам ширүүсэв.",
      contentHtml:
        "<p>Зургадугаар сарын 2-нд 151 Royal Dunk баг Зүүн бүсийн хүчирхэг Өнөр TST багийг 31:28-аар буулгаж авлаа.</p><p>Тавдугаар сарын 24-нд 31-р сургуулийг 37:34-өөр хожсоныхоо дараа Royal Dunk дахин нэг чухал ялалт нэмж, 6-5 амжилттайгаар плей-оффын бүсийн зааг дээр иржээ.</p><p>Өнөр TST-ийн хувьд энэ хожигдол байр дараалалд нь шууд нөлөөлөхгүй ч улирлын төгсгөлийн тоглолтууд дахь өрсөлдөөн эрс ширүүсэж байгааг харууллаа. Хоёр баг плей-оффын эхний шатанд дахин тулгарч магадгүй юм.</p>",
      coverImage: T151.logo || "",
      category: "recap",
      teamIds: [T151.id, UNUR.id],
      author: "СГЛ Медиа",
      date: "2026-06-02",
      featured: false,
    },
  ];

  const batch = db.batch();
  for (const a of articles) {
    const id = newsId();
    batch.set(db.collection("news").doc(id), { id, ...a });
    console.log(`  + ${id} [${a.category}]${a.featured ? " ★" : ""} ${a.title}`);
  }
  await batch.commit();
  console.log(`\n✓ Seeded ${articles.length} news articles.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
