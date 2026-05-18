const router = require("express").Router();
const db = require("../../config/db");

router.get("/summary", async (req, res) => {
  try {

    // Headcount
    const headcount = await db.query(`
      SELECT COUNT(*) AS total
      FROM employees
      WHERE is_active = true
    `);

    // Payroll totals
    const payroll = await db.query(`
      SELECT
        COALESCE(SUM(gross_pay),0) AS gross,
        COALESCE(SUM(net_pay),0) AS net,
        COALESCE(SUM(tds_amount),0) AS tds
      FROM payroll_records
      WHERE status='SUCCESS'
    `);

    // Monthly trend
    const trend = await db.query(`
      SELECT
        month,
        SUM(gross_pay) AS gross,
        SUM(net_pay) AS net,
        SUM(tds_amount) AS tds
      FROM payroll_records
      WHERE status='SUCCESS'
      GROUP BY month
      ORDER BY month
    `);

    // Department breakdown
    const departments = await db.query(`
      SELECT
        d.name AS department,
        COUNT(e.id) AS headcount,
        COALESCE(SUM(pr.gross_pay),0) AS gross_payout,
        COALESCE(SUM(pr.net_pay),0) AS net_payout,
        COALESCE(SUM(pr.tds_amount),0) AS total_tds
      FROM departments d
      LEFT JOIN employees e
        ON e.department_id = d.id
      LEFT JOIN payroll_records pr
        ON pr.employee_id = e.id
      GROUP BY d.name
    `);

    // Tax regime split
 const regime = await db.query(`
  SELECT
    tax_regime AS name,
    COUNT(*)::int AS value
  FROM employees
  GROUP BY tax_regime
`);

    res.json({
      success:true,
      data:{
        stats:{
          headcount:Number(headcount.rows[0].total),
          gross:Number(payroll.rows[0].gross),
          net:Number(payroll.rows[0].net),
          tds:Number(payroll.rows[0].tds)
        },
        trend: trend.rows,
        departments: departments.rows,
        regime: regime.rows
      }
    });

  } catch(err) {
    console.error(err);

    res.status(500).json({
      success:false,
      message:"Server error"
    });
  }
});

module.exports = router;