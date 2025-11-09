/**
 * Advisory Engine
 * Analyzes weather, run history, and schedules to generate
 * proactive insights and recommendations for optimal watering
 */

import type { ForecastDay } from './weatherService.server.js';

interface RunLogEntry {
  id: string;
  zoneId: number;
  zoneName: string;
  source: 'manual' | 'schedule';
  startedAt: string;
  stoppedAt: string;
  durationSec: number;
  success: boolean;
}

interface Schedule {
  id: string;
  zoneId: number;
  startTime: string;
  daysOfWeek: number[];
  durationSec: number;
  enabled: boolean;
  lastRun?: string;
}

interface AdvisoryInsight {
  type: 'info' | 'warning' | 'recommendation' | 'savings';
  icon: '💡' | '⚠️' | '💰' | '🌧️' | '🌱' | '📊';
  message: string;
  priority: number; // 1-5, higher is more important
  actionable?: boolean;
  estimatedSavings?: {
    water: number; // liters
    cost?: number; // dollars
  };
}

interface AdvisoryReport {
  insights: AdvisoryInsight[];
  summary: string;
  weatherContext: {
    rainExpected: boolean;
    rainDays: number;
    totalPrecipExpected: number; // inches
  };
  wateringContext: {
    totalRuns: number;
    zonesIdle: number[];
    averageDurationByZone: { [zoneId: number]: number };
  };
  generatedAt: string;
}

class AdvisoryEngine {
  /**
   * Generate advisory report based on weather, logs, and schedules
   */
  generateReport(
    forecast: ForecastDay[],
    recentLogs: RunLogEntry[],
    schedules: Schedule[],
    zones: { id: number; name: string }[]
  ): AdvisoryReport {
    const insights: AdvisoryInsight[] = [];
    
    // Analyze weather patterns
    const weatherAnalysis = this.analyzeWeather(forecast);
    
    // Analyze watering history
    const historyAnalysis = this.analyzeWateringHistory(recentLogs, zones);
    
    // Analyze schedules vs weather
    const scheduleAnalysis = this.analyzeSchedules(schedules, forecast, historyAnalysis);
    
    // Generate insights
    insights.push(...this.generateWeatherInsights(weatherAnalysis));
    insights.push(...this.generateHistoryInsights(historyAnalysis));
    insights.push(...this.generateScheduleInsights(scheduleAnalysis, weatherAnalysis));
    
    // Sort by priority (highest first)
    insights.sort((a, b) => b.priority - a.priority);
    
    // Generate summary
    const summary = this.generateSummary(insights, weatherAnalysis, historyAnalysis);
    
    return {
      insights,
      summary,
      weatherContext: {
        rainExpected: weatherAnalysis.rainExpected,
        rainDays: weatherAnalysis.rainDays,
        totalPrecipExpected: weatherAnalysis.totalPrecipExpected,
      },
      wateringContext: {
        totalRuns: historyAnalysis.totalRuns,
        zonesIdle: historyAnalysis.zonesIdle,
        averageDurationByZone: historyAnalysis.averageDurationByZone,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Analyze weather forecast for watering implications
   */
  private analyzeWeather(forecast: ForecastDay[]) {
    const next7Days = forecast.slice(0, 7);
    const next3Days = forecast.slice(0, 3);
    const tomorrow = forecast[0];
    
    let rainDays = 0;
    let totalPrecipExpected = 0;
    let highRainDays = 0;
    
    for (const day of next7Days) {
      if (day.precipProbability >= 30) {
        rainDays++;
      }
      if (day.precipProbability >= 60) {
        highRainDays++;
      }
      totalPrecipExpected += day.precipAmount;
    }
    
    const rainExpected = rainDays > 0;
    const significantRainExpected = highRainDays > 0 || totalPrecipExpected > 0.5;
    const tomorrowRainProbability = tomorrow?.precipProbability || 0;
    const tomorrowRainAmount = tomorrow?.precipAmount || 0;
    
    return {
      rainExpected,
      significantRainExpected,
      rainDays,
      highRainDays,
      totalPrecipExpected,
      tomorrowRainProbability,
      tomorrowRainAmount,
      forecast: next7Days,
    };
  }

  /**
   * Analyze recent watering history (last 7 days)
   */
  private analyzeWateringHistory(logs: RunLogEntry[], zones: { id: number; name: string }[]) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Filter logs to last 7 days
    const recentLogs = logs.filter(log => 
      new Date(log.startedAt) >= sevenDaysAgo
    );
    
    // Calculate average duration per zone
    const zoneDurations: { [zoneId: number]: number[] } = {};
    const lastRunByZone: { [zoneId: number]: Date } = {};
    
    for (const log of recentLogs) {
      if (!zoneDurations[log.zoneId]) {
        zoneDurations[log.zoneId] = [];
      }
      zoneDurations[log.zoneId].push(log.durationSec);
      
      const runDate = new Date(log.startedAt);
      if (!lastRunByZone[log.zoneId] || runDate > lastRunByZone[log.zoneId]) {
        lastRunByZone[log.zoneId] = runDate;
      }
    }
    
    const averageDurationByZone: { [zoneId: number]: number } = {};
    for (const [zoneId, durations] of Object.entries(zoneDurations)) {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      averageDurationByZone[parseInt(zoneId)] = Math.round(avg);
    }
    
    // Find zones that haven't run recently (4+ days)
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    
    const zonesIdle: number[] = [];
    for (const zone of zones) {
      const lastRun = lastRunByZone[zone.id];
      if (!lastRun || lastRun < fourDaysAgo) {
        zonesIdle.push(zone.id);
      }
    }
    
    return {
      totalRuns: recentLogs.length,
      recentLogs,
      averageDurationByZone,
      lastRunByZone,
      zonesIdle,
    };
  }

  /**
   * Analyze schedules against weather forecast
   */
  private analyzeSchedules(
    schedules: Schedule[],
    forecast: ForecastDay[],
    historyAnalysis: any
  ) {
    const enabledSchedules = schedules.filter(s => s.enabled);
    const tomorrow = forecast[0];
    const tomorrowDay = new Date(tomorrow.date).getDay();
    
    const schedulesTomorrowWithRain = enabledSchedules.filter(s => 
      s.daysOfWeek.includes(tomorrowDay) && tomorrow.precipProbability >= 50
    );
    
    return {
      totalSchedules: schedules.length,
      enabledSchedules: enabledSchedules.length,
      schedulesTomorrowWithRain,
    };
  }

  /**
   * Generate weather-related insights
   */
  private generateWeatherInsights(weatherAnalysis: any): AdvisoryInsight[] {
    const insights: AdvisoryInsight[] = [];
    
    // Tomorrow's rain forecast
    if (weatherAnalysis.tomorrowRainProbability >= 70) {
      const waterSavings = Math.round(weatherAnalysis.tomorrowRainAmount * 25 * 3.78541); // Convert to liters, assume avg zone
      insights.push({
        type: 'recommendation',
        icon: '🌧️',
        message: `High chance of rain tomorrow (${weatherAnalysis.tomorrowRainProbability}%) — consider skipping scheduled watering to save ~${waterSavings}L`,
        priority: 5,
        actionable: true,
        estimatedSavings: {
          water: waterSavings,
        },
      });
    } else if (weatherAnalysis.tomorrowRainProbability >= 40) {
      insights.push({
        type: 'info',
        icon: '🌧️',
        message: `Moderate rain chance tomorrow (${weatherAnalysis.tomorrowRainProbability}%) — monitor forecast before watering`,
        priority: 3,
        actionable: true,
      });
    }
    
    // Week outlook
    if (weatherAnalysis.significantRainExpected) {
      insights.push({
        type: 'savings',
        icon: '💰',
        message: `${weatherAnalysis.rainDays} rainy days expected this week with ${weatherAnalysis.totalPrecipExpected.toFixed(2)}" total — great opportunity to conserve water`,
        priority: 4,
        actionable: false,
      });
    } else if (weatherAnalysis.rainDays === 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        message: `No rain expected for the next 7 days — ensure adequate watering schedules are in place`,
        priority: 4,
        actionable: true,
      });
    }
    
    return insights;
  }

  /**
   * Generate history-related insights
   */
  private generateHistoryInsights(historyAnalysis: any): AdvisoryInsight[] {
    const insights: AdvisoryInsight[] = [];
    
    // Idle zones
    if (historyAnalysis.zonesIdle.length > 0) {
      const zoneList = historyAnalysis.zonesIdle.join(', ');
      insights.push({
        type: 'warning',
        icon: '🌱',
        message: `Zone${historyAnalysis.zonesIdle.length > 1 ? 's' : ''} ${zoneList} haven't run in 4+ days — soil moisture may be low`,
        priority: 4,
        actionable: true,
      });
    }
    
    // Recent activity summary
    if (historyAnalysis.totalRuns > 0) {
      const avgDurations = Object.values(historyAnalysis.averageDurationByZone) as number[];
      const overallAvg = Math.round(avgDurations.reduce((sum: number, d: number) => sum + d, 0) / avgDurations.length / 60);
      insights.push({
        type: 'info',
        icon: '📊',
        message: `System ran ${historyAnalysis.totalRuns} times in the last 7 days with average duration of ${overallAvg} minutes`,
        priority: 2,
        actionable: false,
      });
    } else {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        message: `No watering activity detected in the last 7 days — verify schedules are enabled`,
        priority: 5,
        actionable: true,
      });
    }
    
    return insights;
  }

  /**
   * Generate schedule-related insights
   */
  private generateScheduleInsights(scheduleAnalysis: any, weatherAnalysis: any): AdvisoryInsight[] {
    const insights: AdvisoryInsight[] = [];
    
    // Schedules conflicting with rain
    if (scheduleAnalysis.schedulesTomorrowWithRain.length > 0) {
      const count = scheduleAnalysis.schedulesTomorrowWithRain.length;
      insights.push({
        type: 'recommendation',
        icon: '💡',
        message: `${count} schedule${count > 1 ? 's' : ''} planned for tomorrow despite ${weatherAnalysis.tomorrowRainProbability}% rain chance — consider postponing`,
        priority: 5,
        actionable: true,
      });
    }
    
    // No schedules enabled
    if (scheduleAnalysis.enabledSchedules === 0 && scheduleAnalysis.totalSchedules > 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        message: `All schedules are disabled — enable at least one to maintain automated watering`,
        priority: 4,
        actionable: true,
      });
    }
    
    return insights;
  }

  /**
   * Generate summary text
   */
  private generateSummary(insights: AdvisoryInsight[], weatherAnalysis: any, historyAnalysis: any): string {
    const highPriorityCount = insights.filter(i => i.priority >= 4).length;
    
    if (highPriorityCount > 0) {
      return `${highPriorityCount} recommendation${highPriorityCount > 1 ? 's' : ''} require attention`;
    } else if (weatherAnalysis.rainExpected) {
      return `Rain expected — system operating efficiently`;
    } else if (historyAnalysis.totalRuns > 0) {
      return `System operating normally`;
    } else {
      return `No recent activity detected`;
    }
  }

  /**
   * Quick check if watering is recommended for a specific day
   */
  shouldWaterToday(forecast: ForecastDay[]): { shouldWater: boolean; reason: string; confidence: number } {
    const today = forecast[0];
    
    if (!today) {
      return {
        shouldWater: true,
        reason: 'Weather data unavailable',
        confidence: 0.5,
      };
    }
    
    if (today.precipProbability >= 70) {
      return {
        shouldWater: false,
        reason: `High rain probability (${today.precipProbability}%) with ${today.precipAmount}" expected`,
        confidence: 0.9,
      };
    }
    
    if (today.precipProbability >= 40 && today.precipAmount >= 0.25) {
      return {
        shouldWater: false,
        reason: `Moderate rain likely (${today.precipProbability}%) with significant precipitation expected`,
        confidence: 0.7,
      };
    }
    
    if (today.precipProbability < 20) {
      return {
        shouldWater: true,
        reason: `Clear weather expected (${today.precipProbability}% rain chance)`,
        confidence: 0.9,
      };
    }
    
    return {
      shouldWater: true,
      reason: `Low rain probability (${today.precipProbability}%) — watering recommended`,
      confidence: 0.7,
    };
  }
}

export const advisoryEngine = new AdvisoryEngine();
export type { AdvisoryInsight, AdvisoryReport };
