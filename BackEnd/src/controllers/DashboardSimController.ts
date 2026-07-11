export const DashboardSimController = {
  async simulate({ body, set }: any) {
    try {
      const { gagalPanen = 0, lonjakanHpp = 0, kreditMacet = 0 } = body || {};

      // Asumsi Finansial Dasar RMU Koperasi
      const initialInvestment = 5000000000; // 5 Miliar
      const baseRevenue = 3000000000; // 3 Miliar
      const baseOpex = 1500000000; // 1.5 Miliar
      const discountRate = 0.10; // 10%
      const projectLife = 5; // 5 Tahun

      const adjustedRevenue = baseRevenue * (1 - Number(gagalPanen) / 100);
      const adjustedOpex = baseOpex * (1 + Number(lonjakanHpp) / 100);
      const lossKredit = baseRevenue * (Number(kreditMacet) / 100);
      
      const annualCashFlow = adjustedRevenue - adjustedOpex - lossKredit;

      let npv = -initialInvestment;
      let pvBenefits = 0;
      
      const cashFlows = [-initialInvestment];
      
      for (let t = 1; t <= projectLife; t++) {
        const pv = annualCashFlow / Math.pow(1 + discountRate, t);
        npv += pv;
        pvBenefits += pv;
        cashFlows.push(annualCashFlow);
      }

      const bcRatio = pvBenefits / initialInvestment;

      // Kalkulasi IRR
      let irr = 0;
      const totalCashFlow = cashFlows.reduce((sum, cf) => sum + cf, 0);
      if (totalCashFlow > 0) {
          let low = -0.99;
          let high = 10.0;
          for (let i = 0; i < 100; i++) {
              let mid = (low + high) / 2;
              let tempNpv = 0;
              for (let t = 0; t < cashFlows.length; t++) {
                  tempNpv += cashFlows[t] / Math.pow(1 + mid, t);
              }
              if (tempNpv > 0) {
                  low = mid;
              } else {
                  high = mid;
              }
          }
          irr = ((low + high) / 2) * 100;
      }

      const status = (npv > 0 && bcRatio > 1 && irr > discountRate * 100) ? "INVESTASI LAYAK" : "TIDAK LAYAK";

      return {
        success: true,
        data: {
          parameter: {
            gagalPanen: Number(gagalPanen),
            lonjakanHpp: Number(lonjakanHpp),
            kreditMacet: Number(kreditMacet)
          },
          financial: {
            npv: Math.round(npv),
            irr: Number(irr.toFixed(2)),
            bcRatio: Number(bcRatio.toFixed(2)),
            annualCashFlow: Math.round(annualCashFlow)
          },
          status
        }
      };

    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  }
};
