module.exports = {
  "schemaVersion": 1,
  "version": "guangdong-2026-10-09-v3",
  "verifiedAt": "2026-10-09",
  "policies": [
    {
      "id": "selfEmployed2026",
      "name": "广东灵活就业人员参加企业职工基本养老保险办法",
      "policyNumber": "粤人社规〔2026〕14号",
      "source": "https://guangdong.chinatax.gov.cn/gdsw/ssfggds/2026-05/06/content_45505ebfc8f54089ae9bd6300fd49138.shtml",
      "effectiveFrom": "2026-05-01",
      "status": "现行，有效期2年；未来测算假设20%自付、8%入账规则延续"
    },
    {
      "id": "retirement",
      "name": "渐进式延迟法定退休年龄决定及国务院办法",
      "policyNumber": "2024年9月13日全国人大常委会决定（无独立文号）",
      "source": "https://www.beijing.gov.cn/zhengce/zhengcefagui/qtwj/202501/t20250102_3979012.html",
      "effectiveFrom": "2025-01-01",
      "status": "现行"
    },
    {
      "id": "flexible",
      "name": "实施弹性退休制度暂行办法",
      "policyNumber": "人社部发〔2024〕94号",
      "source": "https://www.mohrss.gov.cn/wap/zc/zcwj/202501/t20250101_533701.html",
      "effectiveFrom": "2025-01-01",
      "status": "现行；MVP法定退休，提前窗口仅理论下界"
    },
    {
      "id": "basic",
      "name": "广东企业职工基本养老金计发办法",
      "policyNumber": "粤府〔2006〕96号",
      "source": "https://www.dg.gov.cn/zwgk/zfgb/szfwj/content/post_341170.html",
      "effectiveFrom": "2006-07-01",
      "status": "基础及个人账户条款现行引用；旧过渡性条款已调整"
    },
    {
      "id": "account",
      "name": "国务院关于完善企业职工基本养老保险制度的决定及附表",
      "policyNumber": "国发〔2005〕38号",
      "source": "https://zfgb.fujian.gov.cn/6655",
      "effectiveFrom": "2006-01-01",
      "status": "国家整数年龄表现行引用；非整数规则待进一步核验"
    },
    {
      "id": "transition",
      "name": "完善企业职工基本养老保险过渡性养老金计发办法",
      "policyNumber": "粤府函〔2021〕294号",
      "source": "https://www.gd.gov.cn/attachment/0/471/471737/3584595.pdf",
      "effectiveFrom": "2021-01-01",
      "status": "现行引用；2026首次领取不再用视同账户法"
    },
    {
      "id": "cleanup",
      "name": "过渡期后待遇发放及地方养老金清理",
      "policyNumber": "粤人社规〔2021〕24号",
      "source": "https://www.zc.gov.cn/fw/ztfw/grfw/shbx/content/post_7931361.html",
      "effectiveFrom": "2021-01-01",
      "status": "2026首次领取适用过渡期后条款，不发缴费年限津贴"
    },
    {
      "id": "base2025",
      "name": "2025年职工基本养老保险基数通知",
      "policyNumber": "粤人社发〔2025〕32号",
      "source": "https://hrss.gd.gov.cn/zwgk/xxgkml/bmwj/qtwj/shbz/content/post_4789618.html",
      "effectiveFrom": "2025-01-01",
      "status": "2025年度正式参数；其他年度仅供演示"
    },
    {
      "id": "base2026",
      "name": "2026年职工基本养老保险缴费基数上下限通知",
      "policyNumber": "粤人社发〔2026〕24号",
      "source": "https://guangdong.chinatax.gov.cn/gdsw/ssfggds/2026-10/08/content_b40dcb7bf605411fbb12e0f81281dc6b.shtml",
      "effectiveFrom": "2026-07-01",
      "status": "企业职工上限27603元、下限5521元；未来年度沿用作情景估算，非未来官方值"
    }
  ],
  "pensionParameters": [
    {
      "year": 2025,
      "province": "广东",
      "pensionBase": 9493,
      "source": "https://hrss.gd.gov.cn/zwgk/xxgkml/bmwj/qtwj/shbz/content/post_4789618.html",
      "policyNumber": "粤人社发〔2025〕32号",
      "publishDate": "2025-10-27",
      "status": "OFFICIAL"
    },
    {
      "year": 2026,
      "province": "广东",
      "pensionBase": null,
      "source": null,
      "policyNumber": null,
      "publishDate": null,
      "status": "NOT_VERIFIED"
    }
  ],
  "accountMonths": {
    "40": 233,
    "41": 230,
    "42": 226,
    "43": 223,
    "44": 220,
    "45": 216,
    "46": 212,
    "47": 208,
    "48": 204,
    "49": 199,
    "50": 195,
    "51": 190,
    "52": 185,
    "53": 180,
    "54": 175,
    "55": 170,
    "56": 164,
    "57": 158,
    "58": 152,
    "59": 145,
    "60": 139,
    "61": 132,
    "62": 125,
    "63": 117,
    "64": 109,
    "65": 101,
    "66": 93,
    "67": 84,
    "68": 75,
    "69": 65,
    "70": 56
  },
  "contributionRanges": [
    {
      "min": 5510,
      "max": 27549,
      "year": 2025,
      "effectiveFrom": "2025-07"
    },
    {
      "min": 5521,
      "max": 27603,
      "year": 2026,
      "effectiveFrom": "2026-07"
    }
  ]
};
